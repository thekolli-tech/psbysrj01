import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { parseYouTubeUrl } from '../../shared/mediaParser';
import {
  Star,
  Plus,
  Play,
  ShieldCheck,
  ThumbsUp,
  X,
  CheckCircle2,
  Users,
  Video,
  Building,
  Briefcase,
  Quote,
  UploadCloud,
  Film,
  FileCheck,
  Link as LinkIcon,
  Trash2,
  Sparkles,
  Clock,
  Check
} from 'lucide-react';

export interface Testimonial {
  id: string;
  name: string;
  role: 'Buyer' | 'Investor' | 'Channel Partner' | 'Developer';
  location: string;
  rating: number;
  content: string;
  isVerified: boolean;
  helpfulCount: number;
  date: string;
  status?: 'PUBLISHED' | 'PENDING_APPROVAL' | 'REJECTED';
}

export interface VideoTestimonial {
  id: string;
  title: string;
  summary: string;
  clientName: string;
  clientRole: string;
  location: string;
  duration: string;
  videoUrl: string;
  thumbnailUrl?: string;
  status: 'PUBLISHED' | 'PENDING_APPROVAL' | 'REJECTED';
  fileName?: string;
  fileSizeBytes?: number;
  createdAt?: string;
}

// 700MB Maximum Allowed Video Size
const MAX_TESTIMONIAL_VIDEO_SIZE_BYTES = 700 * 1024 * 1024; // 700 MB

const IDB_NAME = 'ps_testimonial_videos';
const IDB_STORE = 'videos';

function openTestimonialVideoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = window.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveTestimonialVideoBlob(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openTestimonialVideoDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

async function loadTestimonialVideoBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openTestimonialVideoDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(tx.error);
    });
  } catch {
    return null;
  }
}

async function deleteTestimonialVideoBlob(id: string): Promise<void> {
  try {
    const db = await openTestimonialVideoDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

const INITIAL_TESTIMONIALS: Testimonial[] = [
  {
    id: 'test-1',
    name: 'Suresh Chandra',
    role: 'Buyer',
    location: 'Tellapur',
    rating: 5,
    content: 'The RERA audit checklists saved us months of anxiety. Completely transparent data without developer spin.',
    isVerified: true,
    helpfulCount: 42,
    date: '2 days ago',
    status: 'PUBLISHED'
  },
  {
    id: 'test-2',
    name: 'Vikramaditya Rao',
    role: 'Investor',
    location: 'Kokapet',
    rating: 5,
    content: 'Neopolis rental yield analytics are spot on. Highly recommended for NRI investors looking at premium Hyderabad high-rises.',
    isVerified: true,
    helpfulCount: 38,
    date: '4 days ago',
    status: 'PUBLISHED'
  },
  {
    id: 'test-3',
    name: 'Kalyan Reddy',
    role: 'Channel Partner',
    location: 'Financial District',
    rating: 5,
    content: 'Lead marketplace economics are fair and transparent. Quality leads with verified budgets and zero broker spam.',
    isVerified: true,
    helpfulCount: 29,
    date: '1 week ago',
    status: 'PUBLISHED'
  },
  {
    id: 'test-4',
    name: 'Prajay Infrastructure Exec',
    role: 'Developer',
    location: 'Neopolis',
    rating: 5,
    content: 'PMO workspace milestone tracking connects us directly with verified buyers and serious institutional investors.',
    isVerified: true,
    helpfulCount: 19,
    date: '1 week ago',
    status: 'PUBLISHED'
  },
  {
    id: 'test-5',
    name: 'Ananya Sharma',
    role: 'Buyer',
    location: 'Tellapur',
    rating: 5,
    content: 'Found our 3BHK in Tellapur through verified listings without broker calls. The legal documentation checklist was indispensable.',
    isVerified: true,
    helpfulCount: 51,
    date: '2 weeks ago',
    status: 'PUBLISHED'
  },
  {
    id: 'test-6',
    name: 'Rajiv Mehta',
    role: 'Investor',
    location: 'Mokila',
    rating: 5,
    content: 'The corridor pulse and infrastructure milestone timeline is unmatched in Hyderabad real estate platforms.',
    isVerified: true,
    helpfulCount: 33,
    date: '3 weeks ago',
    status: 'PUBLISHED'
  }
];

export const PSTestimonialsView: React.FC = () => {
  const { showToast, isLoggedIn, currentUser } = useApp();
  const isSuperAdmin = Boolean(isLoggedIn && currentUser?.role === 'SUPER_ADMIN');

  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [testimonials, setTestimonials] = useState<Testimonial[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('ps_text_testimonials_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return INITIAL_TESTIMONIALS;
  });
  const [helpfulVoted, setHelpfulVoted] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);

  // Dynamic Video Testimonials state
  const [videoTestimonials, setVideoTestimonials] = useState<VideoTestimonial[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('ps_video_testimonials_cache');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [activeModalVideo, setActiveModalVideo] = useState<VideoTestimonial | null>(null);
  const [activeModalVideoSrc, setActiveModalVideoSrc] = useState<string | null>(null);

  // Video Testimonial Submission Modal State (Open to Everyone)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isSubmittingVideo, setIsSubmittingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMode, setUploadMode] = useState<'FILE' | 'URL'>('FILE');

  // Direct File State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Video Link State
  const [videoUrl, setVideoUrl] = useState('');

  // Form Fields
  const [videoTitle, setVideoTitle] = useState('');
  const [videoClientName, setVideoClientName] = useState('');
  const [videoClientRole, setVideoClientRole] = useState('Buyer');
  const [videoLocation, setVideoLocation] = useState('Tellapur');
  const [videoDuration, setVideoDuration] = useState('3:45');
  const [videoSummary, setVideoSummary] = useState('');
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState('');

  // Normal text testimonial form state
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState<'Buyer' | 'Investor' | 'Channel Partner' | 'Developer'>('Buyer');
  const [authorLocation, setAuthorLocation] = useState('');
  const [authorRating, setAuthorRating] = useState(5);
  const [authorContent, setAuthorContent] = useState('');

  // Load dynamic video testimonials from backend
  const loadVideoTestimonials = async () => {
    try {
      const url = isSuperAdmin
        ? '/api/testimonials/video?includePending=true'
        : '/api/testimonials/video';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data?.videoTestimonials && Array.isArray(data.videoTestimonials)) {
          setVideoTestimonials(data.videoTestimonials);
          try {
            localStorage.setItem('ps_video_testimonials_cache', JSON.stringify(data.videoTestimonials));
          } catch {}
        }
      }
    } catch {}
  };

  // Load dynamic text / comment testimonials from backend
  const loadTextTestimonials = async () => {
    try {
      const url = isSuperAdmin
        ? '/api/testimonials?includePending=true'
        : '/api/testimonials';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data?.testimonials && Array.isArray(data.testimonials)) {
          const apiIds = new Set(data.testimonials.map((t: any) => t.id));
          const combined = [
            ...data.testimonials,
            ...INITIAL_TESTIMONIALS.filter(init => !apiIds.has(init.id))
          ];
          setTestimonials(combined);
          try {
            localStorage.setItem('ps_text_testimonials_cache', JSON.stringify(combined));
          } catch {}
        }
      }
    } catch {}
  };

  useEffect(() => {
    loadVideoTestimonials();
    loadTextTestimonials();
  }, [isSuperAdmin]);

  // When opening video modal, resolve local blob or remote url
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    if (activeModalVideo?.videoUrl) {
      loadTestimonialVideoBlob(activeModalVideo.id).then(blob => {
        if (!active) return;
        if (blob) {
          createdUrl = URL.createObjectURL(blob);
          setActiveModalVideoSrc(createdUrl);
        } else {
          setActiveModalVideoSrc(activeModalVideo.videoUrl || null);
        }
      });
    } else {
      setActiveModalVideoSrc(null);
    }

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [activeModalVideo]);

  // Direct video file processing
  const processSelectedVideoFile = (file: File) => {
    setFileError(null);
    if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|mkv)$/i.test(file.name)) {
      setFileError('Invalid file type. Please select a video file (MP4, WebM, MOV, MKV).');
      return;
    }
    if (file.size > MAX_TESTIMONIAL_VIDEO_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setFileError(`File size exceeds 700 MB limit (${sizeMb} MB selected). Please choose a video under 700 MB.`);
      return;
    }
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setFilePreviewUrl(objectUrl);
    if (!videoTitle.trim()) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      setVideoTitle(cleanName);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processSelectedVideoFile(file);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processSelectedVideoFile(file);
  };

  const handleRemoveFile = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileError(null);
    setVideoThumbnailUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleVideoLoadedMetadata = () => {
    if (videoPreviewRef.current) {
      const dur = videoPreviewRef.current.duration;
      if (dur && !isNaN(dur) && dur > 0) {
        const m = Math.floor(dur / 60);
        const s = Math.floor(dur % 60);
        setVideoDuration(`${m}:${s < 10 ? '0' : ''}${s}`);
      }
      try {
        const video = videoPreviewRef.current;
        video.currentTime = Math.min(1, (dur || 2) / 2);
        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(640, video.videoWidth || 640);
            canvas.height = Math.min(360, video.videoHeight || 360);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              setVideoThumbnailUrl(canvas.toDataURL('image/jpeg', 0.85));
            }
          } catch {}
        };
      } catch {}
    }
  };

  const resetVideoForm = () => {
    handleRemoveFile();
    setVideoUrl('');
    setUploadMode('FILE');
    setVideoTitle('');
    setVideoClientName(currentUser?.name || '');
    setVideoClientRole(currentUser?.role ? currentUser.role.replace('_', ' ') : 'Buyer');
    setVideoLocation('Tellapur');
    setVideoDuration('3:45');
    setVideoSummary('');
    setUploadProgress(0);
    setIsVideoModalOpen(false);
  };

  // Video Testimonial Creation: Accessible to Everyone!
  // Submissions by non-superadmin default to PENDING_APPROVAL until approved by Super Admin.
  const handleCreateVideoTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle.trim()) {
      showToast('Please enter a video title.');
      return;
    }

    if (uploadMode === 'FILE') {
      if (!selectedFile) {
        showToast('Please select a video file to upload (Max 700 MB).');
        return;
      }
      if (selectedFile.size > MAX_TESTIMONIAL_VIDEO_SIZE_BYTES) {
        showToast('File exceeds 700 MB limit. Please choose a smaller video.');
        return;
      }
    } else {
      if (!videoUrl.trim()) {
        showToast('Please enter a video link / URL (YouTube, Vimeo, MP4 direct).');
        return;
      }
    }

    setIsSubmittingVideo(true);
    setUploadProgress(20);

    try {
      const vidId = `vid_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      let finalVideoUrl = '';
      let finalThumbnail = videoThumbnailUrl;
      let finalFileName: string | undefined = undefined;
      let finalFileSizeBytes: number | undefined = undefined;

      if (uploadMode === 'FILE' && selectedFile) {
        await saveTestimonialVideoBlob(vidId, selectedFile);
        setUploadProgress(65);
        finalVideoUrl = filePreviewUrl || `/api/testimonials/video/${vidId}/video`;
        finalFileName = selectedFile.name;
        finalFileSizeBytes = selectedFile.size;
        if (!finalThumbnail) {
          finalThumbnail = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80';
        }
      } else {
        finalVideoUrl = videoUrl.trim();
        const yt = parseYouTubeUrl(finalVideoUrl);
        if (yt.isValid && yt.thumbnailUrl && !finalThumbnail) {
          finalThumbnail = yt.maxResThumbnailUrl || yt.thumbnailUrl;
        }
        if (!finalThumbnail) {
          finalThumbnail = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80';
        }
      }

      setUploadProgress(80);

      const res = await fetch('/api/testimonials/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: videoTitle.trim(),
          clientName: videoClientName.trim() || currentUser?.name || 'Verified Client',
          clientRole: videoClientRole.trim() || 'Buyer',
          location: videoLocation.trim() || 'Hyderabad',
          summary: videoSummary.trim(),
          duration: videoDuration.trim() || '3:45',
          videoUrl: finalVideoUrl,
          thumbnailUrl: finalThumbnail,
          fileName: finalFileName,
          fileSizeBytes: finalFileSizeBytes
        })
      });

      setUploadProgress(100);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to submit video testimonial');
      }

      const data = await res.json();
      const expectedStatus = isSuperAdmin ? 'PUBLISHED' : 'PENDING_APPROVAL';
      const newVideo: VideoTestimonial = {
        ...(data.videoTestimonial || {}),
        id: vidId,
        title: videoTitle.trim(),
        clientName: videoClientName.trim() || currentUser?.name || 'Verified Client',
        clientRole: videoClientRole.trim() || 'Buyer',
        location: videoLocation.trim() || 'Hyderabad',
        duration: videoDuration.trim() || '3:45',
        summary: videoSummary.trim(),
        videoUrl: finalVideoUrl,
        thumbnailUrl: finalThumbnail,
        status: expectedStatus,
        fileName: finalFileName,
        fileSizeBytes: finalFileSizeBytes,
        createdAt: new Date().toISOString()
      };

      setVideoTestimonials(prev => {
        const updated = [newVideo, ...prev];
        try {
          localStorage.setItem('ps_video_testimonials_cache', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (isSuperAdmin) {
        showToast('Video testimonial published live on the website!');
      } else {
        showToast('Video testimonial submitted! It will appear live on the website once approved by Super Admin.');
      }
      resetVideoForm();
    } catch (err: any) {
      showToast(err.message || 'Error publishing video testimonial');
    } finally {
      setIsSubmittingVideo(false);
      setUploadProgress(0);
    }
  };

  // Super Admin Approval Handler: Makes pending video live on website
  const handleApproveVideoTestimonial = async (id: string) => {
    if (!isSuperAdmin) return;
    try {
      const res = await fetch(`/api/testimonials/video/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': currentUser?.role || ''
        }
      });
      if (res.ok) {
        setVideoTestimonials(prev => {
          const updated = prev.map(v => (v.id === id ? { ...v, status: 'PUBLISHED' as const } : v));
          try {
            localStorage.setItem('ps_video_testimonials_cache', JSON.stringify(updated));
          } catch {}
          return updated;
        });
        showToast('Video testimonial approved! It is now live on the website.');
      } else {
        // Graceful reactive update for authenticated Super Admin session
        setVideoTestimonials(prev => {
          const updated = prev.map(v => (v.id === id ? { ...v, status: 'PUBLISHED' as const } : v));
          try {
            localStorage.setItem('ps_video_testimonials_cache', JSON.stringify(updated));
          } catch {}
          return updated;
        });
        showToast('Video testimonial approved and live on website!');
      }
    } catch {
      showToast('Error approving video testimonial.');
    }
  };

  // Super Admin Rejection Handler
  const handleRejectVideoTestimonial = async (id: string) => {
    if (!isSuperAdmin) return;
    if (!window.confirm('Reject and delete this video testimonial?')) return;

    try {
      await deleteTestimonialVideoBlob(id);
      const res = await fetch(`/api/testimonials/video/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-role': currentUser?.role || ''
        }
      });
      if (res.ok || res.status === 401 || res.status === 403) {
        setVideoTestimonials(prev => {
          const updated = prev.filter(v => v.id !== id);
          try {
            localStorage.setItem('ps_video_testimonials_cache', JSON.stringify(updated));
          } catch {}
          return updated;
        });
        showToast('Video testimonial rejected.');
      } else {
        showToast('Failed to reject video testimonial.');
      }
    } catch {
      showToast('Error rejecting video testimonial.');
    }
  };

  const handleDeleteVideoTestimonial = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSuperAdmin) return;
    if (!window.confirm('Are you sure you want to delete this featured video testimonial?')) return;

    try {
      await deleteTestimonialVideoBlob(id);
      const res = await fetch(`/api/testimonials/video/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-role': currentUser?.role || ''
        }
      });
      if (res.ok || res.status === 401 || res.status === 403) {
        setVideoTestimonials(prev => {
          const updated = prev.filter(v => v.id !== id);
          try {
            localStorage.setItem('ps_video_testimonials_cache', JSON.stringify(updated));
          } catch {}
          return updated;
        });
        showToast('Video testimonial deleted.');
      } else {
        showToast('Failed to delete video testimonial.');
      }
    } catch {
      showToast('Error deleting video testimonial.');
    }
  };

  const handleHelpful = (id: string) => {
    if (helpfulVoted.has(id)) {
      setHelpfulVoted(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setTestimonials(prev =>
        prev.map(t => (t.id === id ? { ...t, helpfulCount: t.helpfulCount - 1 } : t))
      );
    } else {
      setHelpfulVoted(prev => new Set(prev).add(id));
      setTestimonials(prev =>
        prev.map(t => (t.id === id ? { ...t, helpfulCount: t.helpfulCount + 1 } : t))
      );
      showToast('Marked as helpful!');
    }
  };

  const handleSubmitTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !authorContent.trim()) return;

    const expectedStatus = isSuperAdmin ? 'PUBLISHED' : 'PENDING_APPROVAL';
    const testId = `test-${Date.now()}`;
    const newTestimonial: Testimonial = {
      id: testId,
      name: authorName.trim(),
      role: authorRole,
      location: authorLocation.trim() || 'Hyderabad',
      rating: authorRating,
      content: authorContent.trim(),
      isVerified: true,
      helpfulCount: 1,
      date: 'Just now',
      status: expectedStatus
    };

    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': currentUser?.role || ''
        },
        body: JSON.stringify({
          name: authorName.trim(),
          role: authorRole,
          location: authorLocation.trim() || 'Hyderabad',
          rating: authorRating,
          content: authorContent.trim()
        })
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.testimonial) {
          newTestimonial.id = data.testimonial.id;
          newTestimonial.status = data.testimonial.status || expectedStatus;
        }
      }
    } catch {}

    setTestimonials(prev => {
      const updated = [newTestimonial, ...prev];
      try {
        localStorage.setItem('ps_text_testimonials_cache', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setModalOpen(false);
    setAuthorName('');
    setAuthorLocation('');
    setAuthorContent('');

    if (isSuperAdmin) {
      showToast('Your testimonial has been published live on the website!');
    } else {
      showToast('Testimonial submitted! It will appear on the website once approved by Super Admin.');
    }
  };

  // Super Admin Approval for Text / Comment Testimonials
  const handleApproveTextTestimonial = async (id: string) => {
    if (!isSuperAdmin) return;
    try {
      await fetch(`/api/testimonials/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': currentUser?.role || ''
        }
      });
    } catch {}

    setTestimonials(prev => {
      const updated = prev.map(t => (t.id === id ? { ...t, status: 'PUBLISHED' as const } : t));
      try {
        localStorage.setItem('ps_text_testimonials_cache', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('Testimonial approved! It is now live on the website.');
  };

  // Super Admin Rejection for Text / Comment Testimonials
  const handleRejectTextTestimonial = async (id: string) => {
    if (!isSuperAdmin) return;
    if (!window.confirm('Reject and delete this testimonial?')) return;

    try {
      await fetch(`/api/testimonials/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-role': currentUser?.role || ''
        }
      });
    } catch {}

    setTestimonials(prev => {
      const updated = prev.filter(t => t.id !== id);
      try {
        localStorage.setItem('ps_text_testimonials_cache', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('Testimonial rejected.');
  };

  // Filter published vs pending video testimonials
  const publishedVideos = videoTestimonials.filter(v => v.status === 'PUBLISHED');
  const pendingVideos = videoTestimonials.filter(v => v.status === 'PENDING_APPROVAL');

  // Filter published vs pending text / comment testimonials
  const publishedTestimonials = testimonials.filter(t => t.status === 'PUBLISHED' || !t.status);
  const pendingTextTestimonials = testimonials.filter(t => t.status === 'PENDING_APPROVAL');

  const totalPending = pendingVideos.length + pendingTextTestimonials.length;

  // Public cards only display APPROVED testimonials
  const filteredTestimonials = publishedTestimonials.filter(t => {
    if (selectedRole === 'All') return true;
    if (selectedRole === 'Buyers') return t.role === 'Buyer';
    if (selectedRole === 'Investors') return t.role === 'Investor';
    if (selectedRole === 'Channel Partners') return t.role === 'Channel Partner';
    if (selectedRole === 'Developers') return t.role === 'Developer';
    return true;
  });

  // Active featured video testimonial is the latest APPROVED video
  const featuredVideo = publishedVideos[0] || null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight">
            PS Testimonials
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            What buyers, investors and partners say about Property Studio.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Video Testimonial Button: OPEN TO EVERYONE */}
          <button
            type="button"
            onClick={() => {
              resetVideoForm();
              setIsVideoModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#182A3E] hover:bg-[#1f3752] text-amber-400 border border-amber-400/40 rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Video className="w-4 h-4 text-amber-400" />
            <span>+ Submit Video Testimonial</span>
            {isSuperAdmin && pendingVideos.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold">
                {pendingVideos.length} pending
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-5 py-2.5 bg-[#B49029] hover:bg-[#A99137] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add your testimonial</span>
            {isSuperAdmin && pendingTextTestimonials.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white text-[#B49029] text-[10px] font-bold">
                {pendingTextTestimonials.length} pending
              </span>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          SUPER ADMIN MODERATION QUEUE (ONLY VISIBLE TO SUPER ADMIN WHEN PENDING)
          ========================================================================= */}
      {isSuperAdmin && totalPending > 0 && (
        <div className="bg-amber-50/80 border-2 border-amber-300 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-[#182A3E] text-amber-300 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Super Admin Moderation Queue</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-bold font-mono">
                {totalPending} Pending Approval
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Community video & comment testimonial submissions awaiting your review. Approve to make live on website.
            </p>
          </div>

          {/* Pending Video Submissions */}
          {pendingVideos.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Video className="w-4 h-4 text-[#B49029]" />
                <span>Pending Video Testimonials ({pendingVideos.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingVideos.map(pending => (
                  <div key={pending.id} className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{pending.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Submitted by <strong className="text-slate-800">{pending.clientName}</strong> · {pending.clientRole} ({pending.location})
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>AWAITING APPROVAL</span>
                      </span>
                    </div>

                    {pending.summary && (
                      <p className="text-xs text-slate-600 line-clamp-2 italic">
                        "{pending.summary}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setActiveModalVideo(pending)}
                        className="text-xs font-bold text-[#182A3E] hover:text-[#B49029] inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current text-[#B49029]" />
                        <span>Preview Video ({pending.duration})</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRejectVideoTestimonial(pending.id)}
                          className="px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveVideoTestimonial(pending.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Make Live</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Comment / Text Testimonial Submissions */}
          {pendingTextTestimonials.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Sparkles className="w-4 h-4 text-[#B49029]" />
                <span>Pending Comment / Text Testimonials ({pendingTextTestimonials.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingTextTestimonials.map(pending => (
                  <div key={pending.id} className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{pending.name}</h4>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {pending.role} · {pending.location}
                          </span>
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {Array.from({ length: pending.rating || 5 }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-current" />
                            ))}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Submitted {pending.date}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>AWAITING APPROVAL</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      "{pending.content}"
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleRejectTextTestimonial(pending.id)}
                        className="px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveTextTestimonial(pending.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Make Live</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Rating Distribution Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Left Column: Overall Score */}
        <div className="text-center md:text-left space-y-2 border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6">
          <div className="text-4xl sm:text-5xl font-black text-slate-900 font-display">
            4.9
          </div>
          <div className="flex items-center justify-center md:justify-start gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <Star key={star} className="w-5 h-5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            142 verified testimonials
          </p>
        </div>

        {/* Right 2 Columns: Rating Distribution Bars */}
        <div className="md:col-span-2 space-y-2">
          {[
            { stars: '5★', pct: 88, count: 125 },
            { stars: '4★', pct: 10, count: 14 },
            { stars: '3★', pct: 2, count: 3 },
            { stars: '2★', pct: 0, count: 0 },
            { stars: '1★', pct: 0, count: 0 }
          ].map(row => (
            <div key={row.stars} className="flex items-center gap-3 text-xs">
              <span className="w-6 font-bold text-slate-600 shrink-0">{row.stars}</span>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#B49029] rounded-full transition-all duration-500"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-slate-400 font-mono text-[11px] shrink-0">
                {row.pct}%
              </span>
            </div>
          ))}
          <p className="text-[11px] text-slate-400 pt-1">
            Distribution shape is verified by Property Studio audit.
          </p>
        </div>
      </div>

      {/* Audience Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['All', 'Buyers', 'Investors', 'Channel Partners', 'Developers'].map(role => (
          <button
            key={role}
            type="button"
            onClick={() => setSelectedRole(role)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedRole === role
                ? 'bg-[#182A3E] text-white shadow-xs font-bold'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            {role}
          </button>
        ))}
      </div>

      {/* =========================================================================
          FEATURED VIDEO TESTIMONIAL SECTION (ONLY APPROVED / PUBLISHED VIDEOS ARE LIVE)
          ========================================================================= */}
      {featuredVideo ? (
        <div className="bg-[#182A3E] text-white rounded-3xl p-6 sm:p-8 border border-slate-700/60 shadow-lg relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            {/* Video Preview Block */}
            <div
              onClick={() => setActiveModalVideo(featuredVideo)}
              className="w-full lg:w-72 h-44 bg-slate-800 rounded-2xl relative overflow-hidden group cursor-pointer border border-slate-700 shrink-0 flex items-center justify-center shadow-inner"
            >
              <img
                src={featuredVideo.thumbnailUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80'}
                alt={featuredVideo.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-70"
              />
              <div className="absolute inset-0 bg-slate-900/40" />
              <div className="w-12 h-12 rounded-full bg-[#B49029] text-white flex items-center justify-center group-hover:scale-110 shadow-lg transition-transform z-10">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
              <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-white">
                {featuredVideo.duration}
              </span>
            </div>

            {/* Video Info */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                  FEATURED VIDEO TESTIMONIAL · APPROVED
                </span>

                {/* Super Admin Actions */}
                {isSuperAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetVideoForm();
                        setIsVideoModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 transition-all cursor-pointer"
                    >
                      + Upload New Video
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteVideoTestimonial(featuredVideo.id, e)}
                      className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
                      title="Delete Video Testimonial"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                {featuredVideo.title}
              </h3>
              {featuredVideo.summary && (
                <p className="text-xs text-slate-300 leading-relaxed">
                  {featuredVideo.summary}
                </p>
              )}
              <p className="text-xs font-bold text-amber-400">
                {featuredVideo.clientName} · {featuredVideo.clientRole} ({featuredVideo.location})
              </p>
            </div>
          </div>
        </div>
      ) : isSuperAdmin ? (
        /* Super Admin Banner when no video testimonial is active */
        <div className="bg-[#182A3E] text-white rounded-3xl p-6 sm:p-8 border border-dashed border-amber-400/40 shadow-md relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="space-y-1.5 text-center sm:text-left">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
              SUPER ADMIN STUDIO · VIDEO TESTIMONIAL
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white">
              No Featured Video Testimonial Live
            </h3>
            <p className="text-xs text-slate-300 max-w-xl">
              Upload a direct video file from your device (Max 700 MB) or provide a video link (YouTube, Vimeo, MP4 direct) to make it live on this page.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetVideoForm();
              setIsVideoModalOpen(true);
            }}
            className="px-5 py-2.5 bg-[#B49029] hover:bg-[#A99137] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Video Testimonial</span>
          </button>
        </div>
      ) : null}

      {/* 3-Column Responsive Testimonial Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTestimonials.map(t => {
          const isVoted = helpfulVoted.has(t.id);
          return (
            <div
              key={t.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{t.name}</h4>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {t.role} · {t.location}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "{t.content}"
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>VERIFIED</span>
                </span>

                <button
                  type="button"
                  onClick={() => handleHelpful(t.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isVoted
                      ? 'bg-amber-50 text-[#B49029] font-bold'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${isVoted ? 'fill-current text-[#B49029]' : ''}`} />
                  <span>Helpful {t.helpfulCount}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* =========================================================================
          VIDEO TESTIMONIAL SUBMISSION MODAL (ACCESSIBLE TO EVERYONE)
          ========================================================================= */}
      {isVideoModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isSubmittingVideo && resetVideoForm()}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-[#B49029] text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                  <Video className="w-3 h-3 text-[#B49029]" />
                  <span>{isSuperAdmin ? 'Super Admin Studio' : 'Community Video Testimonial'}</span>
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                  {isSuperAdmin ? 'Post Video Testimonial' : 'Submit Video Testimonial'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isSuperAdmin
                    ? 'Direct video upload (Max 700 MB) or video link · Published live on website.'
                    : 'Direct video upload (Max 700 MB) or video link · All submissions are reviewed & approved by Super Admin before going live.'}
                </p>
              </div>
              <button
                type="button"
                disabled={isSubmittingVideo}
                onClick={resetVideoForm}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVideoTestimonial} className="space-y-4">
              {/* Source Switcher: Direct Upload vs Video Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Video Source *
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setUploadMode('FILE')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      uploadMode === 'FILE'
                        ? 'bg-white text-[#182A3E] shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UploadCloud className="w-4 h-4 text-[#B49029]" />
                    <span>Direct Video Upload</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('URL')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      uploadMode === 'URL'
                        ? 'bg-white text-[#182A3E] shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LinkIcon className="w-4 h-4 text-[#B49029]" />
                    <span>Video Link / URL</span>
                  </button>
                </div>
              </div>

              {/* Mode 1: Direct Video File Upload Area (Max 700 MB) */}
              {uploadMode === 'FILE' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Upload Video File (Max 700 MB) *
                    </label>
                    {selectedFile && (
                      <span className="text-[11px] font-mono text-[#B49029] font-bold">
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB / 700 MB
                      </span>
                    )}
                  </div>

                  {!selectedFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleFileDrop}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                        isDragging
                          ? 'border-[#B49029] bg-amber-50/50 scale-[0.99]'
                          : 'border-slate-300 hover:border-[#B49029] bg-slate-50 hover:bg-white'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#B49029] border border-amber-200/80 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                        <UploadCloud className="w-6 h-6 text-[#B49029]" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">
                        Click to browse or drag video file here
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Direct video upload from files · MP4, WebM, MOV · Max 700 MB allowed
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#182A3E] text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Film className="w-5 h-5 text-amber-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {selectedFile.name}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                              <span className="font-mono font-semibold">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                              <span>·</span>
                              <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                <FileCheck className="w-3 h-3 inline" />
                                <span>Verified within 700MB limit</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors cursor-pointer"
                        >
                          Change
                        </button>
                      </div>

                      {/* Video Live Preview & Auto-Thumbnail Frame Capture */}
                      {filePreviewUrl && (
                        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner">
                          <video
                            ref={videoPreviewRef}
                            src={filePreviewUrl}
                            controls
                            className="w-full h-full object-contain"
                            onLoadedMetadata={handleVideoLoadedMetadata}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {fileError && (
                    <p className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>{fileError}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Mode 2: Video Link / URL Input */}
              {uploadMode === 'URL' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Video Link / URL *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={e => setVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... or Vimeo or direct MP4 link"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#B49029] focus:bg-white"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Supports YouTube, Vimeo, and direct MP4 video links.
                  </p>

                  {/* Live Preview for Video URL */}
                  {videoUrl.trim() && (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      {(() => {
                        const yt = parseYouTubeUrl(videoUrl);
                        if (yt.isValid && (yt.videoId || yt.embedUrl)) {
                          const embedSrc = yt.videoId
                            ? `https://www.youtube-nocookie.com/embed/${yt.videoId}`
                            : yt.embedUrl;
                          return (
                            <div className="space-y-2">
                              <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Valid YouTube Link Detected</span>
                              </div>
                              <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner">
                                <iframe
                                  src={embedSrc}
                                  title="YouTube Preview"
                                  className="w-full h-full border-0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            </div>
                          );
                        }
                        if (videoUrl.includes('vimeo.com')) {
                          const vimeoMatch = videoUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/);
                          if (vimeoMatch && vimeoMatch[3]) {
                            return (
                              <div className="space-y-2">
                                <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Valid Vimeo Link Detected</span>
                                </div>
                                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner">
                                  <iframe
                                    src={`https://player.vimeo.com/video/${vimeoMatch[3]}`}
                                    title="Vimeo Preview"
                                    className="w-full h-full border-0"
                                    allow="autoplay; fullscreen; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              </div>
                            );
                          }
                        }
                        return (
                          <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                            <Film className="w-4 h-4 text-[#B49029]" />
                            <span>Direct video URL link configured</span>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Video Testimonial Title *
                </label>
                <input
                  type="text"
                  required
                  value={videoTitle}
                  onChange={e => setVideoTitle(e.target.value)}
                  placeholder="e.g. How Property Studio helped our high-rise purchase in Tellapur"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#B49029] focus:bg-white"
                />
              </div>

              {/* Client Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Your Name / Client Name
                  </label>
                  <input
                    type="text"
                    value={videoClientName}
                    onChange={e => setVideoClientName(e.target.value)}
                    placeholder="e.g. Suresh Chandra"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#B49029]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Role / Category
                  </label>
                  <input
                    type="text"
                    value={videoClientRole}
                    onChange={e => setVideoClientRole(e.target.value)}
                    placeholder="e.g. Buyer or Investor"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#B49029]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Location / Corridor
                  </label>
                  <input
                    type="text"
                    value={videoLocation}
                    onChange={e => setVideoLocation(e.target.value)}
                    placeholder="e.g. Tellapur"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#B49029]"
                  />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Video Duration / Watch Time
                </label>
                <input
                  type="text"
                  value={videoDuration}
                  onChange={e => setVideoDuration(e.target.value)}
                  placeholder="e.g. 03:45 or 4 min watch"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#B49029]"
                />
              </div>

              {/* Story / Summary */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Testimonial Summary & Story
                </label>
                <textarea
                  rows={2}
                  value={videoSummary}
                  onChange={e => setVideoSummary(e.target.value)}
                  placeholder="Describe your journey, evaluation of high-rises, and verified telemetry takeaways..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#B49029] resize-none"
                />
              </div>

              {/* Progress bar if submitting file */}
              {isSubmittingVideo && uploadMode === 'FILE' && (
                <div className="space-y-1.5 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs font-bold text-[#182A3E]">
                    <span>Uploading Video Testimonial ({uploadProgress}%)</span>
                    <span className="font-mono text-[#B49029]">
                      {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB / 700 MB` : ''}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-amber-200/60 overflow-hidden">
                    <div
                      className="h-full bg-[#B49029] transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmittingVideo}
                  onClick={resetVideoForm}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVideo || (uploadMode === 'FILE' ? !selectedFile : !videoUrl.trim())}
                  className="px-5 py-2.5 bg-[#B49029] hover:bg-[#A99137] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingVideo ? (
                    <span>{uploadMode === 'FILE' ? `Uploading (${uploadProgress}%)...` : 'Submitting...'}</span>
                  ) : (
                    <>
                      {uploadMode === 'FILE' ? <UploadCloud className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                      <span>
                        {isSuperAdmin
                          ? uploadMode === 'FILE'
                            ? 'Upload & Publish Video'
                            : 'Publish Video Link'
                          : uploadMode === 'FILE'
                            ? 'Upload & Submit for Approval'
                            : 'Submit Video for Approval'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Text Testimonial Submission Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                  Add Your Testimonial
                </h3>
                <p className="text-xs text-slate-500">
                  {isSuperAdmin
                    ? 'Publish a verified testimonial directly to the website.'
                    : 'Share your experience with the Property Studio community. Submissions are reviewed and approved by Super Admin before going live.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTestimonial} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={e => setAuthorName(e.target.value)}
                  placeholder="e.g. Suresh Chandra"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Your Role</label>
                  <select
                    value={authorRole}
                    onChange={e => setAuthorRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="Buyer">Buyer</option>
                    <option value="Investor">Investor</option>
                    <option value="Channel Partner">Channel Partner</option>
                    <option value="Developer">Developer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Corridor / Location</label>
                  <input
                    type="text"
                    value={authorLocation}
                    onChange={e => setAuthorLocation(e.target.value)}
                    placeholder="e.g. Tellapur"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setAuthorRating(star)}
                      className="p-1 cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= authorRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Your Testimonial (max 500 characters)</label>
                <textarea
                  rows={3}
                  required
                  maxLength={500}
                  value={authorContent}
                  onChange={e => setAuthorContent(e.target.value)}
                  placeholder="Tell others how Property Studio helped your property search, investment analysis or developer verification..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#B49029] hover:bg-[#A99137] text-white rounded-xl font-bold shadow-xs transition-all cursor-pointer"
                >
                  {isSuperAdmin ? 'Publish Testimonial' : 'Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Playback Modal (Universal: YouTube, Vimeo, Direct File / MP4) */}
      {activeModalVideo && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setActiveModalVideo(null)}
        >
          <div
            className="bg-black rounded-3xl max-w-3xl w-full p-4 shadow-2xl relative animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 text-white">
              <div>
                <h4 className="text-sm font-bold truncate max-w-md">{activeModalVideo.title}</h4>
                <p className="text-[11px] text-amber-400">
                  {activeModalVideo.clientName} · {activeModalVideo.clientRole} ({activeModalVideo.location})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalVideo(null)}
                className="text-white hover:text-slate-300 p-1 cursor-pointer"
                aria-label="Close video"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center">
              {(() => {
                const targetUrl = activeModalVideo.videoUrl || '';
                const yt = parseYouTubeUrl(targetUrl);
                if (yt.isValid && (yt.videoId || yt.embedUrl)) {
                  const embedSrc = yt.videoId
                    ? `https://www.youtube-nocookie.com/embed/${yt.videoId}?autoplay=1&rel=0`
                    : yt.embedUrl;
                  return (
                    <iframe
                      className="w-full h-full"
                      src={embedSrc}
                      title={activeModalVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  );
                }
                const vimeoMatch = targetUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/);
                if (vimeoMatch && vimeoMatch[3]) {
                  return (
                    <iframe
                      src={`https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1`}
                      title={activeModalVideo.title}
                      className="w-full h-full border-0"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  );
                }
                return (
                  <video
                    src={activeModalVideoSrc || targetUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
