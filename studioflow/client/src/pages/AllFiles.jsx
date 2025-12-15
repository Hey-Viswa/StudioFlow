import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Search, 
  Download, 
  Eye, 
  ArrowLeft, 
  ExternalLink,
  FileIcon,
  Image as ImageIcon,
  Video,
  Music,
  Code,
  Archive,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { FilePreviewDialog } from '@/components/FilePreviewDialog';
import { formatFileSize } from '@/lib/api/files';
import { toast } from 'sonner';

export default function AllFiles() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    const fetchAllFiles = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        
        // Fetch a larger number of files to simulate "All Files"
        // Ideally, we implement real pagination in the backend
        const response = await fetch(`${apiUrl}/dashboard/recent-files?limit=100`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setFiles(data.files || []);
          setFilteredFiles(data.files || []);
        } else {
          toast.error('Failed to load files');
        }
      } catch (error) {
        console.error('Error fetching files:', error);
        toast.error('Error fetching files');
      } finally {
        setLoading(false);
      }
    };

    fetchAllFiles();
  }, [getToken]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredFiles(files);
      return;
    }
    const lower = searchTerm.toLowerCase();
    const filtered = files.filter(f => 
      f.filename.toLowerCase().includes(lower) || 
      (f.mimeType && f.mimeType.toLowerCase().includes(lower))
    );
    setFilteredFiles(filtered);
  }, [searchTerm, files]);

  const getFileIconComponent = (mimeType) => {
    if (mimeType?.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-purple-500" />;
    if (mimeType?.startsWith('video/')) return <Video className="w-5 h-5 text-rose-500" />;
    if (mimeType?.startsWith('audio/')) return <Music className="w-5 h-5 text-blue-500" />;
    if (mimeType?.includes('pdf')) return <FileText className="w-5 h-5 text-orange-500" />;
    if (mimeType?.includes('json') || mimeType?.includes('javascript') || mimeType?.includes('html')) return <Code className="w-5 h-5 text-slate-500" />;
    return <FileIcon className="w-5 h-5 text-gray-500" />;
  };

  const handleDownload = async (file) => {
    try {
        if (file.url) {
            window.open(file.url, '_blank');
        } else {
             // Fallback if no direct URL (e.g. strict RBAC or no cached URL)
             // We can use the project specific download logic if needed, 
             // but `recent-files` usually returns signed URLs.
             toast.error("Download link unavailable");
        }
    } catch (e) {
        console.error(e);
        toast.error("Failed to download");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Button variant="ghost" className="pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground mb-2" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Recent Files</h1>
            <p className="text-muted-foreground">Browse all your recently modified files across projects</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search files..." 
                className="pl-9 w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <Card>
            <CardHeader>
                <CardTitle>Files ({filteredFiles.length})</CardTitle>
                <CardDescription>
                    Latest {filteredFiles.length} files from your projects
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Archive className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No files found.</p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredFiles.map((file) => (
                                    <TableRow key={file._id} className="group hover:bg-muted/50 cursor-pointer" onClick={() => setPreviewFile(file)}>
                                        <TableCell>
                                            <div className="flex items-center justify-center p-2 bg-muted/30 rounded-lg">
                                                {getFileIconComponent(file.mimeType)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{file.filename}</span>
                                                <span className="text-xs text-muted-foreground md:hidden">{formatFileSize(file.size)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <Badge variant="secondary" className="font-normal text-xs">
                                                {file.mimeType?.split('/')[1] || 'file'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                                            {formatFileSize(file.size)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {format(new Date(file.updatedAt || file.createdAt), 'MMM dd, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                <Button size="icon" variant="ghost" onClick={() => setPreviewFile(file)}>
                                                    <Eye className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => handleDownload(file)}>
                                                    <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => navigate(`/dashboard/projects/${file.projectId}?tab=files`)}>
                                                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Preview Dialog */}
        <FilePreviewDialog 
          open={!!previewFile} 
          onOpenChange={(open) => !open && setPreviewFile(null)} 
          file={previewFile} 
        />
      </div>
    </div>
  );
}
