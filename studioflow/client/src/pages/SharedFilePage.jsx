import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2, Download, Eye, FileText, Clock, AlertCircle, Lock, CreditCard, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { formatFileSize } from '@/lib/api/files';
import { formatINR } from '@/utils/currency';
import useRazorpay from '@/hooks/useRazorpay';
import { useProjectSocket } from '@/hooks/useSocket';
import api from '@/lib/api';

// ... existing code ...

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Shared File View Page
 * Client view for accessing shared files via share token
 */
export default function SharedFilePage() {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { displayRazorpay } = useRazorpay();
  const [loading, setLoading] = useState(true);
  const [fileData, setFileData] = useState(null);
  const [error, setError] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Real-time updates
  useProjectSocket(fileData?.file?.projectId, {
    onFileUpdated: (updatedFile) => {
      // If the currently viewed file is updated (e.g. unlocked), refresh data
      if (updatedFile.fileId === fileData?.file?.fileId) {
        // console.log('🔄 File updated via socket, refreshing...');
        fetchSharedFile();
      }
    },
    // Listen for generic project updates if needed, but file update is most relevant
  });

  const formatAmount = (amount, currency) => {
    if (amount == null) return '';
    if (currency === 'INR') return formatINR(amount);
    const safe = Number.isFinite(amount) ? amount.toFixed(2) : amount;
    return `${safe} ${currency || ''}`.trim();
  };

  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    if (shareToken) {
      fetchSharedFile();
    }
  }, [shareToken]);

  const fetchSharedFile = async (password = null) => {
    try {
      setLoading(true);
      setError(null);
      setPasswordError(false);
      const token = await getToken();

      const headers = {
        'Authorization': token ? `Bearer ${token}` : '',
      };

      if (password) {
        headers['x-share-password'] = password;
      }

      const response = await fetch(`${API_BASE}/projects/files/shared/${shareToken}`, {
        headers
      });

      let data = null;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.error('Failed to parse shared file response', parseErr);
        throw new Error('Failed to load shared file');
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load shared file');
      }

      if (data?.passwordRequired) {
        setPasswordRequired(true);
        if (password) {
          setPasswordError(true); // If we sent a password and still got required, it was wrong
        }
        setFileData(data); // Store partial data (filename)
        setLoading(false);
        return;
      }

      setPasswordRequired(false);
      setFileData(data);
    } catch (error) {
      console.error('Failed to fetch shared file:', error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (fileData?.previewUrl) {
      setPreviewing(true);
      window.open(fileData.previewUrl, '_blank');
      setTimeout(() => setPreviewing(false), 1000);
    }
  };

  const handleDownload = () => {
    if (fileData?.downloadUrl) {
      const link = document.createElement('a');
      link.href = fileData.downloadUrl;
      link.download = fileData.file.originalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started');
    } else {
      toast.error('Download not available. Contact the project owner.');
    }
  };

  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // ... (existing code)

  const handlePayment = async () => {
    if (!fileData?.invoice) return;

    setProcessingPayment(true);
    try {
      const token = await getToken();

      // 1. Create Order
      const orderResponse = await api.post(`/invoices/project/${fileData.invoice.id}/pay`, {}, { getToken });

      // 2. Open Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: 'StudioFlow',
        description: `Payment for Invoice #${fileData.invoice.number}`,
        order_id: orderResponse.orderId,
        handler: async (response) => {
          try {
            // 3. Verify Payment
            await api.post(`/invoices/project/${fileData.invoice.id}/verify`, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            }, { getToken });

            toast.success('Payment successful! Access granted.');
            setPaymentSuccess(true); // Trigger success UI

            // Redirect to project dashboard after a brief delay
            setTimeout(() => {
              navigate(`/dashboard/projects/${fileData.file.projectId}`);
            }, 2000);

            fetchSharedFile(); // Refresh to get unlocked state
          } catch (err) {
            console.error('Verification error:', err);
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: '', // Optional: Pre-fill if we have user info
          email: '',
        },
        theme: {
          color: '#2563eb',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment initiation failed:', error);
      toast.error(error.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };



  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    fetchSharedFile(passwordInput);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading shared file...</p>
        </div>
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2 justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-center">Password Protected</CardTitle>
            <CardDescription className="text-center">
              This file is password protected. Please enter the password to view it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter password"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-sm text-destructive font-medium">Incorrect password, please try again.</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Unlock File'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const isNotFound = error.includes('not found') || error.includes('404');
    const isAccessDenied = error.includes('denied') || error.includes('403') || error.includes('expired');

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full border-destructive/20 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3 text-destructive mb-2">
              <AlertCircle className="w-8 h-8" />
              <CardTitle className="text-xl">
                {isNotFound ? 'Link Not Found' : isAccessDenied ? 'Access Denied' : 'Something went wrong'}
              </CardTitle>
            </div>
            <CardDescription className="text-base">
              {isNotFound
                ? "This shared link may be invalid or has been revoked by the owner."
                : isAccessDenied
                  ? "You do not have permission to view this file, or the link has expired."
                  : error
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground">
              <p>Troubleshooting steps:</p>
              <ul className="list-disc ml-5 space-y-1 mt-1">
                <li>Check if you are logged in with the correct account.</li>
                <li>Ask the project owner to re-share the file.</li>
                <li>Refresh the page to try again.</li>
              </ul>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!fileData || !fileData.file) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertCircle className="w-6 h-6" />
              <CardTitle>Shared file unavailable</CardTitle>
            </div>
            <CardDescription>The shared link could not be loaded. Please try again or contact the owner.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { file, previewUrl, downloadUrl, allowDownload, expiresAt, invoice, isLocked } = fileData;
  const payableAmount = invoice ? (invoice.payable ?? invoice.amount) : null;
  const invoiceDisplayAmount = formatAmount(payableAmount ?? invoice?.amount, invoice?.currency);
  const expiresDate = expiresAt ? new Date(expiresAt) : null;
  const isExpired = expiresDate ? expiresDate < new Date() : false;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Shared File</h1>
          </div>
          <p className="text-muted-foreground">
            This file has been shared with you by the project owner
          </p>
        </div>

        {/* File Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl">{file.filename}</CardTitle>
                <CardDescription>
                  {file.originalFilename} • {formatFileSize(file.size)}
                </CardDescription>
              </div>
              <Badge variant={allowDownload ? 'default' : 'secondary'}>
                {allowDownload ? (
                  <>
                    <Download className="w-3 h-3 mr-1" />
                    Download Enabled
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 mr-1" />
                    Locked
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">File Type</p>
                <p className="font-medium">{file.mimeType}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Uploaded</p>
                <p className="font-medium">{format(new Date(file.uploadedAt), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Access Expires</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <p className={`font-medium ${isExpired ? 'text-destructive' : ''}`}>
                    {expiresDate ? format(expiresDate, 'MMM dd, yyyy') : 'No expiry set'}
                    {isExpired && ' (Expired)'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Previewable</p>
                <p className="font-medium">{file.isPreviewable ? 'Yes' : 'No'}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              {file.isPreviewable && previewUrl && (
                <Button
                  onClick={handlePreview}
                  disabled={previewing || isExpired}
                  variant="outline"
                  className="flex-1"
                >
                  {previewing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4 mr-2" />
                  )}
                  Preview File
                </Button>
              )}

              {allowDownload && downloadUrl ? (
                <Button
                  onClick={handleDownload}
                  disabled={isExpired}
                  variant="default"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download File
                </Button>
              ) : paymentSuccess ? (
                <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-center text-green-700 font-medium animate-in fade-in zoom-in duration-300">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  Payment Successful! Unlocking...
                </div>
              ) : isLocked && invoice ? (
                <Button
                  onClick={handlePayment}
                  disabled={processingPayment || isExpired}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {processingPayment ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Pay {invoiceDisplayAmount || 'invoice amount'} to Unlock
                </Button>
              ) : (
                <Button variant="outline" className="flex-1" disabled>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Download Not Available
                </Button>
              )}
            </div>

            {isLocked && invoice && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-amber-900 font-medium mb-1">Premium Content Locked</p>
                    <p className="text-amber-700">
                      This file is part of a premium deliverable. To download it, you must settle
                      <strong> Invoice #{invoice.number}</strong> ({invoiceDisplayAmount}).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!allowDownload && !isLocked && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="text-blue-900 font-medium mb-1">Preview Only Access</p>
                <p className="text-blue-700">
                  You can preview this file but cannot download it yet.
                </p>
              </div>
            )}

            {isExpired && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm">
                <p className="text-destructive font-medium mb-1">Access Expired</p>
                <p className="text-destructive/80">
                  This share link has expired. Please contact the project owner to request a new link.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Container */}
        {file.isPreviewable && file.mimeType.startsWith('image/') && previewUrl && !isExpired && (
          <Card className={cn(isLocked && "filter blur-md select-none pointer-events-none")}>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={previewUrl}
                alt={file.filename}
                className="w-full rounded-lg border"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
