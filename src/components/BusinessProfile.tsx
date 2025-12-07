'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Business, Discussion } from '../types';
import Navbar from './Layout/Navbar';
import { optimizeImage, fileToBase64 } from '../utils/imageOptimization';
import SimpleMapPicker from './SimpleMapPicker';

interface BusinessProfileProps {
  businessId?: string;
  readOnly?: boolean;
}

interface ContactInfo {
  phone?: string;
  email?: string;
}

interface Socials {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  website?: string;
}

export default function BusinessProfile({ businessId, readOnly = false }: BusinessProfileProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState<number>(0);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [discussionsLoading, setDiscussionsLoading] = useState(false);
  const [newDiscussionContent, setNewDiscussionContent] = useState('');
  const [submittingDiscussion, setSubmittingDiscussion] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState<{ [key: number]: string }>({});
  const [submittingReply, setSubmittingReply] = useState<{ [key: number]: boolean }>({});
  const [expandedReplies, setExpandedReplies] = useState<{ [key: number]: boolean }>({});
  
  // Edit mode states
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editContactInfo, setEditContactInfo] = useState<ContactInfo>({});
  const [editSocials, setEditSocials] = useState<Socials>({});
  const [editLocation, setEditLocation] = useState('');
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);
  const [editStoreHours, setEditStoreHours] = useState<{ [key: string]: { open: string; close: string } }>({});
  const [saving, setSaving] = useState(false);
  const [uploadingCoverPhoto, setUploadingCoverPhoto] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Convert file to base64

  useEffect(() => {
    if (!businessId) {
      setError('Business ID is required');
      setLoading(false);
      return;
    }

    const fetchBusiness = async () => {
      try {
        setLoading(true);
        setError(null);
        const id = parseInt(businessId, 10);
        
        if (isNaN(id)) {
          setError('Invalid business ID');
          setLoading(false);
          return;
        }

        const response = await api.getBusinessById(id);
        
        if (response.success && response.data) {
          const businessData = response.data as Business;
          console.log('Business loaded:', { id: businessData.id, name: businessData.name, logo: businessData.logo });
          setBusiness(businessData);
          
          // Fetch favorite count for all users (including guests)
          try {
            const countResponse = await api.getBusinessFavoriteCount(id);
            if (countResponse.success && countResponse.data) {
              setFavoriteCount(countResponse.data.count || 0);
            }
          } catch (err) {
            console.error('Error fetching favorite count:', err);
          }
          
          // Check if business is favorited (only for authenticated users)
          if (user) {
            try {
              const favoriteResponse = await api.checkFavorite(id);
              if (favoriteResponse.success && favoriteResponse.data) {
                setIsFavorite(favoriteResponse.data.isFavorite || false);
              }
            } catch (err) {
              // Silently fail favorite check
              console.error('Error checking favorite:', err);
            }
          }

          // Fetch discussions for this business
          fetchDiscussions(id);
        } else {
          setError(response.message || 'Business not found');
        }
      } catch (err: any) {
        console.error('Error fetching business:', err);
        console.error('Error details:', {
          message: err.message,
          code: err.code,
          response: err.response?.data,
          status: err.response?.status,
          url: err.config?.url
        });
        // Provide more detailed error messages
        if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error') || err.message?.includes('ERR_CONNECTION_REFUSED')) {
          setError('Cannot connect to server. Please make sure the backend is running on http://localhost:7000');
        } else if (err.response?.status === 404) {
          setError('Business not found');
        } else if (err.response?.status === 403) {
          setError(err.response?.data?.message || 'You do not have permission to view this business');
        } else if (err.response?.status === 500) {
          setError('Server error. Please try again later.');
        } else if (err.response?.status === 400) {
          setError(err.response?.data?.message || 'Invalid business ID');
        } else {
          setError(err.response?.data?.message || err.message || 'Failed to load business. Please check your connection.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [businessId, user]);

  const fetchDiscussions = async (businessId: number) => {
    try {
      setDiscussionsLoading(true);
      const response = await api.getBusinessDiscussions(businessId);
      
      if (response.success && response.data) {
        // Backend now returns discussions with nested replies already organized
        const discussions = Array.isArray(response.data) ? response.data : [];
        setDiscussions(discussions);
      }
    } catch (err) {
      console.error('Error fetching discussions:', err);
      setDiscussions([]);
    } finally {
      setDiscussionsLoading(false);
    }
  };

  const handleCreateDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !business || !newDiscussionContent.trim()) return;

    try {
      setSubmittingDiscussion(true);
      const response = await api.createDiscussion(business.id, newDiscussionContent.trim());
      
      if (response.success) {
        setNewDiscussionContent('');
        // Refresh discussions
        await fetchDiscussions(business.id);
      } else {
        alert(response.message || 'Failed to post discussion');
      }
    } catch (err: any) {
      console.error('Error creating discussion:', err);
      alert(err.response?.data?.message || err.message || 'Failed to post discussion');
    } finally {
      setSubmittingDiscussion(false);
    }
  };

  const handleReply = async (discussionId: number) => {
    if (!user || !business || !replyContent[discussionId]?.trim()) return;

    try {
      setSubmittingReply({ ...submittingReply, [discussionId]: true });
      const response = await api.replyToDiscussion(discussionId, replyContent[discussionId].trim(), business.id);
      
      if (response.success) {
        setReplyContent({ ...replyContent, [discussionId]: '' });
        setReplyingTo(null);
        // Refresh discussions
        await fetchDiscussions(business.id);
      } else {
        alert(response.message || 'Failed to post reply');
      }
    } catch (err: any) {
      console.error('Error creating reply:', err);
      alert(err.response?.data?.message || err.message || 'Failed to post reply');
    } finally {
      setSubmittingReply({ ...submittingReply, [discussionId]: false });
    }
  };

  const handleCancelReply = (discussionId: number) => {
    setReplyingTo(null);
    setReplyContent({ ...replyContent, [discussionId]: '' });
  };

  const toggleReplies = (discussionId: number) => {
    setExpandedReplies({
      ...expandedReplies,
      [discussionId]: !expandedReplies[discussionId]
    });
  };

  // Count total replies including nested ones
  const countTotalReplies = (replies: Discussion[] | undefined): number => {
    if (!replies || replies.length === 0) return 0;
    return replies.reduce((count, reply) => {
      return count + 1 + countTotalReplies(reply.replies);
    }, 0);
  };

  // Recursive component to render nested replies
  const renderReply = (reply: Discussion, depth: number = 0, parentIndent: number = 0) => {
    const maxDepth = 5; // Limit nesting depth to prevent UI issues
    // Base indent: 52px (to align with main discussion avatar + gap)
    // Main discussion has: 40px avatar + 12px gap = 52px
    // Each nested level adds: 40px (32px avatar + 12px gap) + 16px (border left padding)
    const baseIndent = 52; // Aligns with main discussion (40px avatar + 12px gap)
    const levelIndent = 40; // Reply avatar width (32px) + gap (12px)
    const borderPadding = 16; // Padding for the left border (pl-4 = 16px)
    
    // Calculate total indent based on depth and parent position
    let totalIndent: number;
    if (depth === 0) {
      // First level replies align with main discussion
      totalIndent = baseIndent;
    } else {
      // Nested replies: parent indent + level indent + border padding
      totalIndent = parentIndent + levelIndent + borderPadding;
    }
    
    return (
      <div key={reply.id} className={depth > 0 ? 'mt-4' : ''}>
        {/* Reply Content */}
        <div 
          className="flex gap-3 min-w-fit" 
          style={{ marginLeft: depth === 0 ? `${baseIndent}px` : `${totalIndent}px` }}
        >
          {reply.user.image ? (
            <img 
              src={reply.user.image} 
              alt={reply.user.name} 
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-xs">
                {reply.user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h5 className="font-medium text-white text-sm">{reply.user.name}</h5>
              <span className="text-xs text-white/60">{formatDate(reply.createdAt)}</span>
            </div>
            <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap mb-2">{reply.content}</p>
            
            {/* Reply Button for nested replies */}
            {user && depth < maxDepth && (
              <button
                onClick={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
                className="flex items-center gap-2 text-xs text-white/70 hover:text-[#6ab8d8] transition-colors"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M10 9V5l-7 7 7 7v-4c1.17 0 2.34.17 3.5.5 2.5 1 4.5 3.5 5.5 6.5 1.5-4.5 4-8.5 7-10.5-3-1-6-1-9 0z"/>
                </svg>
                {replyingTo === reply.id ? 'Cancel Reply' : 'Reply'}
              </button>
            )}
          </div>
        </div>

        {/* Reply Form for nested replies */}
        {user && replyingTo === reply.id && depth < maxDepth && (
          <div 
            className="mt-3" 
            style={{ marginLeft: `${totalIndent}px` }}
          >
            <form onSubmit={(e) => { e.preventDefault(); handleReply(reply.id); }} className="flex gap-3">
              {user.image ? (
                <img 
                  src={user.image} 
                  alt={user.name} 
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <textarea
                  value={replyContent[reply.id] || ''}
                  onChange={(e) => setReplyContent({ ...replyContent, [reply.id]: e.target.value })}
                  placeholder={`Reply to ${reply.user.name}...`}
                  className="w-full p-2 bg-white/5 border border-white/10 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#6ab8d8] focus:border-transparent text-white placeholder:text-white/50 text-sm"
                  rows={2}
                  maxLength={500}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-white/50">
                    {(replyContent[reply.id] || '').length}/500 characters
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleCancelReply(reply.id)}
                      className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!replyContent[reply.id]?.trim() || submittingReply[reply.id]}
                      className="px-3 py-1.5 text-xs bg-gradient-to-br from-[#0f4c75] to-[#1b627d] hover:shadow-[0_4px_15px_rgba(15,76,117,0.4)] text-white rounded-lg font-medium transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                      {submittingReply[reply.id] ? 'Posting...' : 'Post Reply'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Show/Hide Replies Toggle */}
        {reply.replies && reply.replies.length > 0 && depth < maxDepth && (
          <div 
            className={`mt-2 ${depth > 0 ? 'mb-3' : ''}`}
            style={{ marginLeft: `${totalIndent}px` }}
          >
            <button
              onClick={() => toggleReplies(reply.id)}
              className="flex items-center gap-2 text-xs text-white/60 hover:text-[#6ab8d8] transition-colors"
            >
              <svg 
                viewBox="0 0 24 24" 
                width="14" 
                height="14" 
                fill="currentColor"
                className={`transition-transform ${expandedReplies[reply.id] ? 'rotate-90' : ''}`}
              >
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
              {expandedReplies[reply.id] 
                ? `Hide ${countTotalReplies(reply.replies)} ${countTotalReplies(reply.replies) === 1 ? 'reply' : 'replies'}`
                : `Show ${countTotalReplies(reply.replies)} ${countTotalReplies(reply.replies) === 1 ? 'reply' : 'replies'}`
              }
            </button>
          </div>
        )}

        {/* Recursively render nested replies */}
        {reply.replies && reply.replies.length > 0 && depth < maxDepth && expandedReplies[reply.id] && (
          <div 
            className="mt-3 pl-4 border-l-2 border-white/10 min-w-fit" 
            style={{ marginLeft: `${totalIndent}px` }}
          >
            {reply.replies.map((nestedReply) => renderReply(nestedReply, depth + 1, totalIndent))}
          </div>
        )}
      </div>
    );
  };

  // Start editing a section
  const startEditing = (section: string) => {
    if (!business) return;
    
    setEditingSection(section);
    
    if (section === 'description') {
      setEditDescription(business.description);
    } else if (section === 'contact') {
      const contactInfo = parseContactInfo(business.contactInfo);
      setEditContactInfo(contactInfo);
      const socials = parseSocials(business.socials);
      setEditSocials(socials);
    } else if (section === 'location') {
      setEditLocation(business.location || '');
      setEditLat(business.lat || null);
      setEditLng(business.lng || null);
    } else if (section === 'storeHours') {
      try {
        const hours = business.openTime ? JSON.parse(business.openTime) : {};
        setEditStoreHours(hours);
      } catch {
        setEditStoreHours({});
      }
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingSection(null);
    setEditDescription('');
    setEditContactInfo({});
    setEditSocials({});
    setEditLocation('');
    setEditLat(null);
    setEditLng(null);
    setEditStoreHours({});
  };

  // Save business updates
  const saveBusinessUpdate = async (updates: any) => {
    if (!business) return;
    
    try {
      setSaving(true);
      const response = await api.updateBusiness(business.id, updates);
      
      if (response.success && response.data) {
        const updatedBusiness = response.data as Business;
        console.log('Business updated:', { id: updatedBusiness.id, logo: updatedBusiness.logo, coverPhoto: updatedBusiness.coverPhoto });
        setBusiness(updatedBusiness);
        setEditingSection(null);
      } else {
        alert(response.message || 'Failed to update business');
      }
    } catch (err: any) {
      console.error('Error updating business:', err);
      alert(err.response?.data?.message || err.message || 'Failed to update business');
    } finally {
      setSaving(false);
    }
  };

  // Handle cover photo upload
  const handleCoverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!business || !canEdit) return;
    
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Cover photo must be less than 5MB');
      return;
    }

    try {
      setUploadingCoverPhoto(true);
      const base64 = await optimizeImage(file, 'COVER_PHOTO');
      await saveBusinessUpdate({ coverPhoto: base64 });
    } catch (err) {
      console.error('Error uploading cover photo:', err);
      alert('Failed to upload cover photo');
    } finally {
      setUploadingCoverPhoto(false);
      e.target.value = '';
    }
  };

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!business || !canEdit) {
      console.log('Cannot upload logo:', { business: !!business, canEdit });
      return;
    }
    
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('Logo upload started:', { fileName: file.name, fileSize: file.size });

    if (file.size > 5 * 1024 * 1024) {
      alert('Logo must be less than 5MB');
      return;
    }

    try {
      setUploadingLogo(true);
      console.log('Optimizing and converting logo...');
      const base64 = await optimizeImage(file, 'LOGO');
      console.log('Logo optimization complete, updating business...');
      await saveBusinessUpdate({ logo: base64 });
      console.log('Logo update successful');
    } catch (err) {
      console.error('Error uploading logo:', err);
      alert('Failed to upload logo: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  // Handle gallery upload
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!business || !canEdit) return;
    
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setGalleryUploading(true);
      const currentGallery = business.gallery || [];
      const newImages: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name} is too large. Maximum size is 5MB`);
          continue;
        }
        const base64 = await optimizeImage(file, 'GALLERY');
        newImages.push(base64);
      }
      
      if (newImages.length > 0) {
        await saveBusinessUpdate({ gallery: [...currentGallery, ...newImages] });
      }
    } catch (err) {
      console.error('Error uploading gallery:', err);
      alert('Failed to upload gallery images');
    } finally {
      setGalleryUploading(false);
      e.target.value = '';
    }
  };

  // Handle gallery modal
  const handleOpenGalleryModal = (index: number) => {
    setCurrentImageIndex(index);
    setGalleryModalOpen(true);
  };

  const handleCloseGalleryModal = () => {
    setGalleryModalOpen(false);
  };

  const handleNextImage = () => {
    if (business?.gallery && business.gallery.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % business.gallery.length);
    }
  };

  const handlePrevImage = () => {
    if (business?.gallery && business.gallery.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + business.gallery.length) % business.gallery.length);
    }
  };

  const handleGoToImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (!galleryModalOpen || !business?.gallery || business.gallery.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentImageIndex((prev) => (prev - 1 + business.gallery.length) % business.gallery.length);
      } else if (e.key === 'ArrowRight') {
        setCurrentImageIndex((prev) => (prev + 1) % business.gallery.length);
      } else if (e.key === 'Escape') {
        setGalleryModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [galleryModalOpen, business?.gallery]);

  // Handle gallery image deletion
  const handleDeleteGalleryImage = async (index: number) => {
    if (!business || !canEdit) return;
    
    if (!confirm('Delete this photo?')) return;
    
    try {
      const currentGallery = business.gallery || [];
      const newGallery = currentGallery.filter((_, i) => i !== index);
      await saveBusinessUpdate({ gallery: newGallery });
    } catch (err) {
      console.error('Error deleting gallery image:', err);
      alert('Failed to delete photo');
    }
  };

  // Save description
  const handleSaveDescription = async () => {
    if (!business) return;
    await saveBusinessUpdate({ description: editDescription });
  };

  // Handle map location selection
  const handleMapLocationSelect = (lat: number, lng: number) => {
    setEditLat(lat);
    setEditLng(lng);
  };

  // Save contact info and socials
  const handleSaveContact = async () => {
    if (!business) return;
    
    const contactInfoString = Object.keys(editContactInfo).length > 0 
      ? JSON.stringify(editContactInfo) 
      : null;
    
    const socialsObj = Object.keys(editSocials).length > 0 ? editSocials : null;
    
    await saveBusinessUpdate({ 
      contactInfo: contactInfoString,
      socials: socialsObj
    });
  };

  // Save location
  const handleSaveLocation = async () => {
    if (!business) return;
    
    await saveBusinessUpdate({ 
      location: editLocation.trim() || business.location,
      lat: editLat,
      lng: editLng
    });
  };

  // Save store hours
  const handleSaveStoreHours = async () => {
    if (!business) return;
    
    const storeHoursString = Object.keys(editStoreHours).length > 0 
      ? JSON.stringify(editStoreHours) 
      : null;
    
    await saveBusinessUpdate({ openTime: storeHoursString });
  };

  const formatDate = (dateString: string | Date): string => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString.toString();
    }
  };

  const handleToggleFavorite = async () => {
    if (!user || !business) return;

    try {
      setFavoriteLoading(true);
      const response = await api.toggleFavorite(business.id);
      
      if (response.success) {
        const newFavoriteState = !isFavorite;
        setIsFavorite(newFavoriteState);
        
        // Update favorite count
        setFavoriteCount(prev => newFavoriteState ? prev + 1 : prev - 1);
        
        // Refresh count from server to ensure accuracy
        try {
          const countResponse = await api.getBusinessFavoriteCount(business.id);
          if (countResponse.success && countResponse.data) {
            setFavoriteCount(countResponse.data.count || 0);
          }
        } catch (err) {
          console.error('Error refreshing favorite count:', err);
        }
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleGetDirections = () => {
    if (!business) return;

    // Open Google Maps immediately to avoid pop-up blockers
    // If coordinates are available, use them for accurate directions
    if (business.lat && business.lng) {
      // Open with destination - Google Maps will ask for user location if needed
      const url = `https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}&travelmode=driving`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      // Fallback to address-based search if coordinates aren't available
      const searchQuery = business.location 
        ? `${business.location}, ${business.barangay}, Philippines`
        : business.name;
      
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };


  const parseContactInfo = (contactInfo: string | null | undefined): ContactInfo => {
    if (!contactInfo) return {};
    
    try {
      const parsed = typeof contactInfo === 'string' ? JSON.parse(contactInfo) : contactInfo;
      return parsed as ContactInfo;
    } catch {
      // If not JSON, assume it's just a phone number
      return { phone: contactInfo };
    }
  };

  const parseSocials = (socials: any): Socials => {
    if (!socials) return {};
    
    try {
      if (typeof socials === 'string') {
        return JSON.parse(socials) as Socials;
      }
      return socials as Socials;
    } catch {
      return {};
    }
  };

  const formatStoreHours = (openTime?: string | null, closeTime?: string | null): string => {
    if (!openTime || !closeTime) return 'Hours not specified';
    
    try {
      // Try to parse as time strings (e.g., "09:00", "17:00")
      const open = openTime.includes(':') ? openTime : `${openTime.slice(0, 2)}:${openTime.slice(2)}`;
      const close = closeTime.includes(':') ? closeTime : `${closeTime.slice(0, 2)}:${closeTime.slice(2)}`;
      
      // Convert to 12-hour format
      const [openHour, openMin] = open.split(':').map(Number);
      const [closeHour, closeMin] = close.split(':').map(Number);
      
      const openAmPm = openHour >= 12 ? 'PM' : 'AM';
      const closeAmPm = closeHour >= 12 ? 'PM' : 'AM';
      const openHour12 = openHour > 12 ? openHour - 12 : openHour === 0 ? 12 : openHour;
      const closeHour12 = closeHour > 12 ? closeHour - 12 : closeHour === 0 ? 12 : closeHour;
      
      return `${openHour12}:${openMin.toString().padStart(2, '0')} ${openAmPm} - ${closeHour12}:${closeMin.toString().padStart(2, '0')} ${closeAmPm}`;
    } catch {
      return `${openTime} - ${closeTime}`;
    }
  };

  const isOwner = user && business && user.id === business.ownerId;
  // Only owners can edit (not admins), and only if not in read-only mode
  const canEdit = isOwner && !readOnly;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-[#6ab8d8] mx-auto mb-4"></div>
            <p className="text-white/80">Loading business details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-[#1a1a1a]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" className="text-red-500 mx-auto mb-4">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <h2 className="text-2xl font-bold text-white mb-2">Business Not Found</h2>
            <p className="text-white/80 mb-4">{error || 'The business you are looking for does not exist.'}</p>
            <button
              onClick={() => router.push('/businesses')}
              className="px-6 py-2.5 bg-gradient-to-br from-[#0f4c75] to-[#1b627d] hover:shadow-[0_4px_15px_rgba(15,76,117,0.4)] text-white rounded-lg font-semibold transition-all duration-300 hover:-translate-y-0.5"
            >
              Browse Businesses
            </button>
          </div>
        </div>
      </div>
    );
  }

  const contactInfo = parseContactInfo(business.contactInfo);
  const socials = parseSocials(business.socials);
  const storeHours = formatStoreHours(business.openTime, business.closeTime);

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navbar />
      
      {/* Banner Image */}
      <div className="relative h-[400px] overflow-hidden group">
        {business.coverPhoto ? (
          <img 
            src={business.coverPhoto} 
            alt={business.name} 
            className="absolute top-0 left-0 w-full h-full object-cover" 
          />
        ) : (
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#1e3c72] to-[#2a5298]"></div>
        )}
        {canEdit && (
          <label className="absolute top-24 right-4 sm:top-28 sm:right-6 p-2.5 sm:px-4 sm:py-2 bg-black/70 hover:bg-black/90 backdrop-blur-sm text-white rounded-lg font-medium cursor-pointer transition-all z-10 flex items-center gap-0 sm:gap-2 shadow-lg">
            <svg viewBox="0 0 24 24" width="20" height="20" className="sm:w-[18px] sm:h-[18px]" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            <span className="hidden sm:inline whitespace-nowrap">
              {uploadingCoverPhoto ? 'Uploading...' : 'Change Cover Photo'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverPhotoUpload}
              disabled={uploadingCoverPhoto}
              style={{ display: 'none' }}
            />
          </label>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20">
          {/* Main Info - Bottom Left */}
          <div className="absolute bottom-0 left-0 right-0">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 pt-4 sm:pt-6 md:pt-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-end gap-3 sm:gap-4 flex-1">
              {/* Business Logo */}
              <div className="flex-shrink-0 relative">
                {business.logo && business.logo.trim() ? (
                  <img
                    key={business.logo} // Force re-render when logo changes
                    src={business.logo}
                    alt={`${business.name} logo`}
                    className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl object-contain bg-white/10 p-1 border-2 border-white/90 shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const placeholder = target.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = 'flex';
                    }}
                    onLoad={() => {
                      // Hide placeholder when image loads successfully
                      const placeholder = document.querySelector(`[data-logo-placeholder="${business?.id}"]`) as HTMLElement;
                      if (placeholder) placeholder.style.display = 'none';
                    }}
                  />
                ) : null}
                <div 
                  data-logo-placeholder={business.id}
                  className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl bg-gradient-to-br from-[#1e3c72] to-[#2a5298] flex items-center justify-center border-2 border-white/90 shadow-lg"
                  style={{ display: (business.logo && business.logo.trim()) ? 'none' : 'flex' }}
                >
                  <span className="text-white font-bold text-xl sm:text-2xl md:text-3xl">
                    {business.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                {canEdit && (
                  <label 
                    htmlFor="logo-upload-input"
                    className="absolute -bottom-2 -right-2 px-2 py-1.5 bg-black/80 hover:bg-black/90 backdrop-blur-sm text-white rounded-lg cursor-pointer transition-all z-20 flex items-center gap-1.5 shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Logo change button clicked');
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                    <span className="text-xs font-medium whitespace-nowrap">{uploadingLogo ? 'Uploading...' : 'Change'}</span>
                    <input
                      id="logo-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>
              
              {/* Business Name and Info */}
              <div className="flex-1 min-w-0 pb-10">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 sm:mb-2 break-words drop-shadow-lg">{business.name}</h1>
                
                {/* Badges */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  {business.isVerified && (
                    <span className="px-2 sm:px-3 py-1 bg-green-500/90 backdrop-blur-sm text-white rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1 border border-white/30">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      Verified
                    </span>
                  )}
                  <span className="px-2 sm:px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs sm:text-sm font-semibold border border-white/30">
                    {business.category}
                  </span>
                  <span className="px-2 sm:px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs sm:text-sm font-semibold border border-white/30">
                    {business.barangay}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Favorite Section - Bottom Right */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {user ? (
                /* Favorite Button with Count - For authenticated users */
                <button
                  onClick={handleToggleFavorite}
                  disabled={favoriteLoading}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors backdrop-blur-sm border border-white/30 ${
                    isFavorite
                      ? 'bg-red-500/90 text-white hover:bg-red-600/90'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg 
                    viewBox="0 0 24 24" 
                    width="20" 
                    height="20" 
                    fill={isFavorite ? 'currentColor' : 'none'} 
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  <span className="hidden sm:inline">Favorite</span>
                  <span className="text-white/90 font-semibold text-sm sm:text-base">
                    ({favoriteCount})
                  </span>
                </button>
              ) : (
                /* Favorite Count - For guests */
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg backdrop-blur-sm bg-white/20 border border-white/30">
                  <svg 
                    viewBox="0 0 24 24" 
                    width="20" 
                    height="20" 
                    fill="currentColor"
                    className="text-white"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  <span className="text-white font-semibold text-sm sm:text-base">
                    {favoriteCount} {favoriteCount === 1 ? 'favorite' : 'favorites'}
                  </span>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <div className="flex-1 w-full">
          {/* About Section */}
          <div className="bg-[#2a2a2a] rounded-[20px] p-4 sm:p-6 mb-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-white/5">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white">About {business.name}</h2>
              {canEdit && editingSection !== 'description' && (
                <button 
                  className="flex items-center gap-1.5 text-xs sm:text-sm text-[#6ab8d8] hover:text-[#8bc5d9] cursor-pointer transition-colors self-start sm:self-auto" 
                  onClick={() => startEditing('description')}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                  Edit
                </button>
              )}
            </div>
            {editingSection === 'description' ? (
              <div className="space-y-4">
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#6ab8d8] transition-colors resize-none"
                  placeholder="Describe your business..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDescription}
                    disabled={saving}
                    className="px-4 py-2 bg-[#6ab8d8] text-white rounded-lg font-medium hover:bg-[#5aa8c8] transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={saving}
                    className="px-4 py-2 bg-[#2a2a2a] border border-white/10 text-white rounded-lg font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-white/80 text-sm sm:text-base leading-relaxed">{business.description}</p>
            )}
          </div>

          {/* Gallery */}
          <div className="bg-[#2a2a2a] rounded-[20px] p-4 sm:p-6 mb-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-white/5" id="gallery-section">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Gallery</h2>
              {canEdit && (
                <label className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-br from-[#0f4c75] to-[#1b627d] hover:shadow-[0_4px_15px_rgba(15,76,117,0.4)] text-white rounded-lg font-medium cursor-pointer transition-all duration-300 hover:-translate-y-0.5 text-sm sm:text-base w-full sm:w-auto justify-center">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                  {galleryUploading ? 'Uploading...' : 'Add Photos'}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleGalleryUpload}
                    disabled={galleryUploading}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
            {business.gallery && business.gallery.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {business.gallery.slice(0, 6).map((photo, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden relative group">
                    <img 
                      src={photo} 
                      alt={`${business.name} gallery ${index + 1}`} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer" 
                      onClick={() => handleOpenGalleryModal(index)}
                    />
                    {canEdit && (
                      <button
                        className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGalleryImage(index);
                        }}
                        title="Delete photo"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </button>
                    )}
                    {/* Show "View More" overlay on the 6th image if there are more images */}
                    {index === 5 && business.gallery.length > 6 && (
                      <div 
                        className="absolute inset-0 bg-black/70 flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors z-20"
                        onClick={() => handleOpenGalleryModal(0)}
                      >
                        <div className="text-center text-white">
                          <p className="text-2xl font-bold">+{business.gallery.length - 6}</p>
                          <p className="text-sm mt-1">View All</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                  {canEdit && (
                    <label className="aspect-square rounded-lg border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-[#6ab8d8] transition-colors">
                      <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" className="text-white/60">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                      </svg>
                      <p className="text-white/60 mt-2 text-sm">Add Photo</p>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleGalleryUpload}
                        disabled={galleryUploading}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" className="text-white/40 mx-auto mb-4">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
                <p className="text-white/60 mb-4">No photos in gallery yet</p>
                {canEdit && (
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#0f4c75] to-[#1b627d] hover:shadow-[0_4px_15px_rgba(15,76,117,0.4)] text-white rounded-lg font-medium cursor-pointer transition-all duration-300 hover:-translate-y-0.5">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                    Add First Photo
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleGalleryUpload}
                      disabled={galleryUploading}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Owner Info */}
          {business.owner && (
            <div className="bg-[#2a2a2a] rounded-[20px] p-4 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-white/5">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Business Owner</h3>
              <div className="flex items-center gap-3">
                {business.owner.image ? (
                  <img 
                    src={business.owner.image} 
                    alt={business.owner.name} 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {business.owner.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-base font-semibold text-white m-0">{business.owner.name}</p>
                  <p className="text-sm text-white/60 m-0">Owner</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[380px] flex-shrink-0 space-y-4 sm:space-y-6">
          {/* Contact Information */}
          <div className="bg-[#2a2a2a] rounded-[20px] p-4 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-white/5">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-white">Contact Information</h3>
              {canEdit && editingSection !== 'contact' && (
                <button 
                  className="flex items-center gap-1.5 text-xs sm:text-sm text-[#6ab8d8] hover:text-[#8bc5d9] cursor-pointer transition-colors" 
                  onClick={() => startEditing('contact')}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                  Edit
                </button>
              )}
            </div>
            
            {editingSection === 'contact' ? (
              <div className="space-y-4">
                {/* Contact Info Editing */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={editContactInfo.phone || ''}
                    onChange={(e) => setEditContactInfo({ ...editContactInfo, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#6ab8d8] transition-colors"
                    placeholder="+63 123 456 7890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
                  <input
                    type="email"
                    value={editContactInfo.email || ''}
                    onChange={(e) => setEditContactInfo({ ...editContactInfo, email: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#6ab8d8] transition-colors"
                    placeholder="email@example.com"
                  />
                </div>
                
                {/* Social Media Editing */}
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm font-medium text-white/80 mb-3">Social Media</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Facebook URL</label>
                      <input
                        type="url"
                        value={editSocials.facebook || ''}
                        onChange={(e) => setEditSocials({ ...editSocials, facebook: e.target.value })}
                        className="w-full px-4 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#6ab8d8] transition-colors"
                        placeholder="https://facebook.com/yourbusiness"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Instagram URL</label>
                      <input
                        type="url"
                        value={editSocials.instagram || ''}
                        onChange={(e) => setEditSocials({ ...editSocials, instagram: e.target.value })}
                        className="w-full px-4 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#6ab8d8] transition-colors"
                        placeholder="https://instagram.com/yourbusiness"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Twitter URL</label>
                      <input
                        type="url"
                        value={editSocials.twitter || ''}
                        onChange={(e) => setEditSocials({ ...editSocials, twitter: e.target.value })}
                        className="w-full px-4 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#6ab8d8] transition-colors"
                        placeholder="https://twitter.com/yourbusiness"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Website URL</label>
                      <input
                        type="url"
                        value={editSocials.website || ''}
                        onChange={(e) => setEditSocials({ ...editSocials, website: e.target.value })}
                        className="w-full px-4 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#6ab8d8] transition-colors"
                        placeholder="https://yourbusiness.com"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveContact}
                    disabled={saving}
                    className="px-4 py-2 bg-[#6ab8d8] text-white rounded-lg font-medium hover:bg-[#5aa8c8] transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={saving}
                    className="px-4 py-2 bg-[#2a2a2a] border border-white/10 text-white rounded-lg font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex gap-3">
                <div className="w-5 h-5 flex-shrink-0 text-white/60 mt-0.5">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white/60 mb-1">Address</p>
                  <p className="text-sm text-white m-0 break-words">{business.location}</p>
                </div>
              </div>

              {contactInfo.phone && (
                <div className="flex gap-3">
                  <div className="w-5 h-5 flex-shrink-0 text-white/60 mt-0.5">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white/60 mb-1">Phone</p>
                    <a href={`tel:${contactInfo.phone}`} className="text-sm text-white m-0 hover:text-[#6ab8d8] transition-colors break-words">
                      {contactInfo.phone}
                    </a>
                  </div>
                </div>
              )}

              {contactInfo.email && (
                <div className="flex gap-3 col-span-2">
                  <div className="w-5 h-5 flex-shrink-0 text-white/60 mt-0.5">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white/60 mb-1">Email</p>
                    <a href={`mailto:${contactInfo.email}`} className="text-sm text-white m-0 hover:text-[#6ab8d8] transition-colors break-words">
                      {contactInfo.email}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {(socials.instagram || socials.facebook || socials.twitter || socials.website) && (
              <div className="pt-6 border-t border-white/10">
                <p className="text-sm font-medium text-white/60 mb-3">Follow Us</p>
                <div className="flex gap-3">
                  {socials.instagram && (
                    <a 
                      href={socials.instagram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 hover:opacity-90 flex items-center justify-center cursor-pointer transition-all"
                      title="Instagram"
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </a>
                  )}
                  {socials.facebook && (
                    <a 
                      href={socials.facebook} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-[#1877F2] hover:bg-[#166FE5] flex items-center justify-center cursor-pointer transition-colors"
                      title="Facebook"
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </a>
                  )}
                  {socials.twitter && (
                    <a 
                      href={socials.twitter} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-[#1DA1F2] hover:bg-[#1a8cd8] flex items-center justify-center cursor-pointer transition-colors"
                      title="Twitter"
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                    </a>
                  )}
                  {socials.website && (
                    <a 
                      href={socials.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors text-white/80 hover:text-white"
                      title="Website"
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.34.16-2h4.68c.09.66.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/>
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}
              </>
            )}
          </div>

          {/* Store Hours */}
          <div className="bg-[#2a2a2a] rounded-[20px] p-4 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 text-white/60">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/>
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white m-0">Store Hours</h3>
              </div>
              {canEdit && editingSection !== 'storeHours' && (
                <button 
                  className="flex items-center gap-1.5 text-xs sm:text-sm text-[#6ab8d8] hover:text-[#8bc5d9] cursor-pointer transition-colors" 
                  onClick={() => startEditing('storeHours')}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                  {business.openTime && business.closeTime ? 'Edit' : 'Add'}
                </button>
              )}
            </div>
            {editingSection === 'storeHours' ? (
              <div className="space-y-4">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <div key={day} className="flex items-center gap-2">
                    <div className="w-24 text-sm text-white/80">{day}</div>
                    <input
                      type="time"
                      value={editStoreHours[day.toLowerCase()]?.open || ''}
                      onChange={(e) => setEditStoreHours({
                        ...editStoreHours,
                        [day.toLowerCase()]: { ...editStoreHours[day.toLowerCase()], open: e.target.value, close: editStoreHours[day.toLowerCase()]?.close || '' }
                      })}
                      className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ab8d8] transition-colors"
                    />
                    <span className="text-white/60">to</span>
                    <input
                      type="time"
                      value={editStoreHours[day.toLowerCase()]?.close || ''}
                      onChange={(e) => setEditStoreHours({
                        ...editStoreHours,
                        [day.toLowerCase()]: { ...editStoreHours[day.toLowerCase()], open: editStoreHours[day.toLowerCase()]?.open || '', close: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ab8d8] transition-colors"
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveStoreHours}
                    disabled={saving}
                    className="px-4 py-2 bg-[#6ab8d8] text-white rounded-lg font-medium hover:bg-[#5aa8c8] transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={saving}
                    className="px-4 py-2 bg-[#2a2a2a] border border-white/10 text-white rounded-lg font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : business.openTime && business.closeTime ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-base font-medium text-white">Open Hours</span>
                  <span className="text-base text-white/80">{storeHours}</span>
                </div>
              </div>
            ) : (
              <p className="text-white/60 text-sm">No store hours set</p>
            )}
          </div>

          {/* Location & Directions */}
          <div className="bg-[#2a2a2a] rounded-[20px] p-4 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 text-white/60">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white m-0">Location</h3>
              </div>
              {canEdit && editingSection !== 'location' && (
                <button
                  onClick={() => startEditing('location')}
                  className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors flex items-center gap-1.5"
                  title="Edit location"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                  Edit
                </button>
              )}
            </div>
            
            {editingSection === 'location' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Location/Address</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#6ab8d8] transition-colors mb-3"
                    placeholder="Enter full address or use map below to select location"
                  />
                  <div className="mt-2">
                    <SimpleMapPicker
                      lat={editLat}
                      lng={editLng}
                      address={editLocation}
                      onLocationSelect={handleMapLocationSelect}
                      height="300px"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveLocation}
                    disabled={saving}
                    className="px-4 py-2 bg-[#6ab8d8] text-white rounded-lg font-medium hover:bg-[#5aa8c8] transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={saving}
                    className="px-4 py-2 bg-[#2a2a2a] border border-white/10 text-white rounded-lg font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <iframe
                    src={
                      business.lat && business.lng
                        ? `https://www.google.com/maps?q=${business.lat},${business.lng}&hl=en&z=14&output=embed`
                        : `https://www.google.com/maps?q=${encodeURIComponent(business.location + ', ' + business.barangay + ', Philippines')}&hl=en&z=14&output=embed`
                    }
                    width="100%"
                    height="200"
                    className="sm:h-[250px]"
                    style={{ border: 0, borderRadius: '8px' }}
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`${business.name} Location`}
                  ></iframe>
                </div>
                <button 
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-[#0f4c75] to-[#1b627d] hover:shadow-[0_4px_15px_rgba(15,76,117,0.4)] text-white rounded-lg font-semibold cursor-pointer transition-all duration-300 hover:-translate-y-0.5" 
                  onClick={handleGetDirections}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M21.71 11.29l-9-9c-.39-.39-1.02-.39-1.41 0l-9 9c-.39.39-.39 1.02 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9c.39-.38.39-1.01 0-1.41zM14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5l3.5 3.5-3.5 3.5z"/>
                  </svg>
                  Get Directions
                </button>
              </>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Discussions Section - Separate container at bottom */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 pb-6 sm:pb-8 md:pb-10">
        <div className="bg-[#2a2a2a] rounded-[20px] p-4 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-white/5 overflow-x-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Community Discussions</h2>
          
          {/* Create Discussion Form */}
          {user ? (
            <form onSubmit={handleCreateDiscussion} className="mb-8">
              <div className="flex gap-3 mb-3">
                {user.image ? (
                  <img 
                    src={user.image} 
                    alt={user.name} 
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <textarea
                    value={newDiscussionContent}
                    onChange={(e) => setNewDiscussionContent(e.target.value)}
                    placeholder="Share your thoughts about this business..."
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#6ab8d8] focus:border-transparent text-white placeholder:text-white/50"
                    rows={3}
                    maxLength={1000}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-white/60">
                      {newDiscussionContent.length}/1000 characters
                    </span>
                    <button
                      type="submit"
                      disabled={!newDiscussionContent.trim() || submittingDiscussion}
                      className="px-4 py-2 bg-gradient-to-br from-[#0f4c75] to-[#1b627d] hover:shadow-[0_4px_15px_rgba(15,76,117,0.4)] text-white rounded-lg font-medium transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                      {submittingDiscussion ? 'Posting...' : 'Post Discussion'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="mb-8 p-4 bg-white/5 rounded-lg border border-white/10">
              <p className="text-white/80 text-sm">
                <a href="/login" className="text-[#6ab8d8] hover:text-[#8bc5d9] hover:underline font-medium transition-colors">Sign in</a> to join the discussion
              </p>
            </div>
          )}

          {/* Discussions List */}
          {discussionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3c72]"></div>
            </div>
          ) : discussions.length > 0 ? (
            <div className="space-y-6 min-w-0">
              {discussions.map((discussion) => (
                <div key={discussion.id} className="pb-6 border-b border-white/10 last:border-0 last:pb-0 min-w-0">
                  {/* Main Discussion */}
                  <div className="flex gap-3 mb-4">
                    {discussion.user.image ? (
                      <img 
                        src={discussion.user.image} 
                        alt={discussion.user.name} 
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm">
                          {discussion.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white">{discussion.user.name}</h4>
                        <span className="text-sm text-white/60">{formatDate(discussion.createdAt)}</span>
                      </div>
                      <p className="text-white/80 leading-relaxed whitespace-pre-wrap mb-3">{discussion.content}</p>
                      
                      {/* Reply Button */}
                      {user && (
                        <button
                          onClick={() => setReplyingTo(replyingTo === discussion.id ? null : discussion.id)}
                          className="flex items-center gap-2 text-sm text-white/70 hover:text-[#6ab8d8] transition-colors"
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M10 9V5l-7 7 7 7v-4c1.17 0 2.34.17 3.5.5 2.5 1 4.5 3.5 5.5 6.5 1.5-4.5 4-8.5 7-10.5-3-1-6-1-9 0z"/>
                          </svg>
                          {replyingTo === discussion.id ? 'Cancel Reply' : 'Reply'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Reply Form */}
                  {user && replyingTo === discussion.id && (
                    <div className="ml-0 sm:ml-[52px] mb-4">
                      <form onSubmit={(e) => { e.preventDefault(); handleReply(discussion.id); }} className="flex gap-3">
                        {user.image ? (
                          <img 
                            src={user.image} 
                            alt={user.name} 
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-xs">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <textarea
                            value={replyContent[discussion.id] || ''}
                            onChange={(e) => setReplyContent({ ...replyContent, [discussion.id]: e.target.value })}
                            placeholder={`Reply to ${discussion.user.name}...`}
                            className="w-full p-2 bg-white/5 border border-white/10 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#6ab8d8] focus:border-transparent text-white placeholder:text-white/50 text-sm"
                            rows={2}
                            maxLength={500}
                          />
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-white/50">
                              {(replyContent[discussion.id] || '').length}/500 characters
                            </span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleCancelReply(discussion.id)}
                                className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={!replyContent[discussion.id]?.trim() || submittingReply[discussion.id]}
                                className="px-3 py-1.5 text-sm bg-gradient-to-br from-[#0f4c75] to-[#1b627d] hover:shadow-[0_4px_15px_rgba(15,76,117,0.4)] text-white rounded-lg font-medium transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                              >
                                {submittingReply[discussion.id] ? 'Posting...' : 'Post Reply'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Show/Hide Replies Toggle for Main Discussion */}
                  {discussion.replies && discussion.replies.length > 0 && (
                    <div className="mt-3 mb-3 ml-0 sm:ml-[52px]">
                      <button
                        onClick={() => toggleReplies(discussion.id)}
                        className="flex items-center gap-2 text-sm text-white/70 hover:text-[#6ab8d8] transition-colors"
                      >
                        <svg 
                          viewBox="0 0 24 24" 
                          width="16" 
                          height="16" 
                          fill="currentColor"
                          className={`transition-transform ${expandedReplies[discussion.id] !== false ? 'rotate-90' : ''}`}
                        >
                          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                        </svg>
                        {expandedReplies[discussion.id] === false
                          ? `Show ${countTotalReplies(discussion.replies)} ${countTotalReplies(discussion.replies) === 1 ? 'reply' : 'replies'}`
                          : `Hide ${countTotalReplies(discussion.replies)} ${countTotalReplies(discussion.replies) === 1 ? 'reply' : 'replies'}`
                        }
                      </button>
                    </div>
                  )}

                  {/* Replies - Rendered recursively */}
                  {discussion.replies && discussion.replies.length > 0 && expandedReplies[discussion.id] !== false && (
                    <div className="mt-4 min-w-fit">
                      {discussion.replies.map((reply) => renderReply(reply, 0, 0))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" className="text-white/40 mx-auto mb-4">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
              </svg>
              <p className="text-white/60">No discussions yet. Be the first to share your thoughts!</p>
            </div>
          )}
        </div>
      </div>

      {/* Gallery Modal/Slider */}
      {galleryModalOpen && business?.gallery && business.gallery.length > 0 && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center pt-32 pb-4 px-4 bg-black/80 backdrop-blur-sm"
          onClick={handleCloseGalleryModal}
        >
          <div 
            className="relative max-w-6xl w-full max-h-[calc(100vh-10rem)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleCloseGalleryModal}
              className="absolute -top-12 right-0 z-50 p-2 bg-black/70 hover:bg-black/90 rounded-full text-white transition-colors backdrop-blur-sm"
              aria-label="Close gallery"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>

            {/* Main Image */}
            <div className="relative flex-1 flex items-center justify-center overflow-hidden">
              {/* Previous Arrow */}
              {business.gallery.length > 1 && (
                <button
                  onClick={handlePrevImage}
                  className="absolute left-4 z-10 p-3 bg-black/70 hover:bg-black/90 rounded-full text-white transition-all hover:scale-110 backdrop-blur-sm"
                  aria-label="Previous image"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                  </svg>
                </button>
              )}

              {/* Image */}
              <img
                src={business.gallery[currentImageIndex]}
                alt={`${business.name} gallery ${currentImageIndex + 1}`}
                className="max-w-full max-h-[calc(100vh-14rem)] object-contain rounded-lg shadow-2xl"
              />

              {/* Next Arrow */}
              {business.gallery.length > 1 && (
                <button
                  onClick={handleNextImage}
                  className="absolute right-4 z-10 p-3 bg-black/70 hover:bg-black/90 rounded-full text-white transition-all hover:scale-110 backdrop-blur-sm"
                  aria-label="Next image"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Image Counter */}
            {business.gallery.length > 1 && (
              <div className="mt-4 flex justify-center">
                <div className="text-center text-white/90 text-sm font-medium bg-black/70 px-4 py-1.5 rounded-full backdrop-blur-sm">
                  {currentImageIndex + 1} / {business.gallery.length}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
