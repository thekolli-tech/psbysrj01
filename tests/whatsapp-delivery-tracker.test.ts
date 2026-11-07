import assert from 'node:assert/strict';
import test from 'node:test';
import {
  recordOtpQueued,
  recordOtpSubmitted,
  recordOtpSent,
  recordOtpDelivered,
  recordOtpFailed,
  getOtpDeliveryStatus,
  processGupshupWebhookEvent,
  clearDeliveryCacheForTesting
} from '../src/server/otpDeliveryTracker.ts';
import { sendWhatsAppOtp } from '../src/server/whatsappOtp.ts';

test.beforeEach(() => {
  clearDeliveryCacheForTesting();
});

test('OTP Delivery State Machine: QUEUED -> SUBMITTED -> SENT -> DELIVERED', () => {
  const phone = '+91 98490 12345';
  const msgId = 'gs_msg_test_001';

  // 1. Queued
  const queued = recordOtpQueued(phone);
  assert.equal(queued.status, 'QUEUED');
  assert.equal(queued.providerMessageId, null);

  // 2. Submitted
  const submitted = recordOtpSubmitted(phone, msgId);
  assert.equal(submitted.status, 'SUBMITTED');
  assert.equal(submitted.providerMessageId, msgId);

  // Status can be retrieved by phone or message ID
  const byPhone = getOtpDeliveryStatus(phone);
  const byMsg = getOtpDeliveryStatus(msgId);
  assert.equal(byPhone?.status, 'SUBMITTED');
  assert.equal(byMsg?.status, 'SUBMITTED');

  // 3. Sent
  const sent = recordOtpSent(msgId);
  assert.equal(sent?.status, 'SENT');
  assert.ok(sent?.sentAt);

  // 4. Delivered
  const delivered = recordOtpDelivered(msgId);
  assert.equal(delivered?.status, 'DELIVERED');
  assert.ok(delivered?.deliveredAt);

  // Should not regress from DELIVERED if late SENT arrives
  recordOtpSent(msgId);
  assert.equal(getOtpDeliveryStatus(msgId)?.status, 'DELIVERED');
});

test('OTP Delivery State Machine: FAILED transition with reason', () => {
  const phone = '+91 98490 54321';
  const msgId = 'gs_msg_fail_002';

  recordOtpQueued(phone);
  recordOtpSubmitted(phone, msgId);

  const failed = recordOtpFailed(msgId, 'User not on WhatsApp');
  assert.equal(failed?.status, 'FAILED');
  assert.equal(failed?.failureReason, 'User not on WhatsApp');
});

test('Gupshup Webhook Event Processing: parses V2 message-events correctly', () => {
  const phone = '+91 98490 99999';
  const msgId = 'gupshup_evt_101';
  recordOtpSubmitted(phone, msgId);

  // 1. Sent event
  const sentRes = processGupshupWebhookEvent({
    app: 'propertystudio',
    timestamp: Date.now(),
    version: 2,
    type: 'message-event',
    payload: {
      id: 'wamid.test.1',
      gsId: msgId,
      type: 'sent',
      destination: '919849099999'
    }
  });
  assert.equal(sentRes.handled, true);
  assert.equal(sentRes.status, 'SENT');
  assert.equal(getOtpDeliveryStatus(msgId)?.status, 'SENT');

  // 2. Delivered event
  const delivRes = processGupshupWebhookEvent({
    app: 'propertystudio',
    timestamp: Date.now(),
    version: 2,
    type: 'message-event',
    payload: {
      id: 'wamid.test.2',
      gsId: msgId,
      type: 'delivered',
      destination: '919849099999'
    }
  });
  assert.equal(delivRes.handled, true);
  assert.equal(delivRes.status, 'DELIVERED');
  assert.equal(getOtpDeliveryStatus(msgId)?.status, 'DELIVERED');

  // 3. Failed event
  const failMsgId = 'gupshup_evt_fail';
  recordOtpSubmitted('+91 98490 88888', failMsgId);
  const failRes = processGupshupWebhookEvent({
    app: 'propertystudio',
    timestamp: Date.now(),
    version: 2,
    type: 'message-event',
    payload: {
      id: failMsgId,
      type: 'failed',
      destination: '919849088888',
      payload: { cause: 'DLR_FAILED_OPERATOR_DOWN' }
    }
  });
  assert.equal(failRes.handled, true);
  assert.equal(failRes.status, 'FAILED');
  assert.equal(getOtpDeliveryStatus(failMsgId)?.status, 'FAILED');
  assert.equal(getOtpDeliveryStatus(failMsgId)?.failureReason, 'DLR_FAILED_OPERATOR_DOWN');
});

test('Gupshup Template Dispatch formats both Body and Copy-Code button parameters [otp, otp]', async () => {
  const oldKey = process.env.GUPSHUP_API_KEY;
  const oldNum = process.env.GUPSHUP_WHATSAPP_NUMBER;
  const oldApp = process.env.GUPSHUP_APP_NAME;
  const oldTpl = process.env.GUPSHUP_OTP_TEMPLATE_ID;

  process.env.GUPSHUP_API_KEY = 'test_key';
  process.env.GUPSHUP_WHATSAPP_NUMBER = '919014555566';
  process.env.GUPSHUP_APP_NAME = 'propertystudio';
  process.env.GUPSHUP_OTP_TEMPLATE_ID = 'b803ba1e-de34-496c-aa01-71db36cf8343';

  try {
    let capturedBody = '';
    const mockFetch = async (url: any, init: any) => {
      capturedBody = String(init?.body || '');
      return new Response(JSON.stringify({
        status: 'submitted',
        messageId: 'mock_msg_id_777'
      }), { status: 202, headers: { 'Content-Type': 'application/json' } });
    };

    const res = await sendWhatsAppOtp('+91 98490 12345', '716293', mockFetch as any);
    assert.equal(res.success, true);
    assert.equal(res.messageId, 'mock_msg_id_777');

    const params = new URLSearchParams(capturedBody);
    const tplData = JSON.parse(params.get('template') || '{}');
    assert.equal(tplData.id, 'b803ba1e-de34-496c-aa01-71db36cf8343');
    // Crucial check: parameter array must contain 2 entries for Body and Copy Code button
    assert.deepEqual(tplData.params, ['716293', '716293']);

    // Check delivery tracker automatically captured SUBMITTED state
    const trackerRecord = getOtpDeliveryStatus('mock_msg_id_777');
    assert.equal(trackerRecord?.status, 'SUBMITTED');
    assert.equal(trackerRecord?.providerMessageId, 'mock_msg_id_777');
  } finally {
    process.env.GUPSHUP_API_KEY = oldKey;
    process.env.GUPSHUP_WHATSAPP_NUMBER = oldNum;
    process.env.GUPSHUP_APP_NAME = oldApp;
    process.env.GUPSHUP_OTP_TEMPLATE_ID = oldTpl;
  }
});
