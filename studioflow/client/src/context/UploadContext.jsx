import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { uploadFile } from '@/lib/api/files';
import { toast } from 'sonner';

const UploadContext = createContext();

export const useUploads = () => {
    const context = useContext(UploadContext);
    if (!context) {
        throw new Error('useUploads must be used within an UploadProvider');
    }
    return context;
};

export const UploadProvider = ({ children }) => {
    const { getToken } = useAuth();
    const [uploads, setUploads] = useState([]);
    const abortControllersRef = useRef({});

    const startUpload = useCallback(async (file, projectId, callbacks = {}) => {
        const uploadId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newUpload = {
            id: uploadId,
            file,
            projectId,
            progress: 0,
            state: 'pending',
            error: null,
        };

        setUploads((prev) => [...prev, newUpload]);

        try {
            // Pass getToken function directly so it can be called again internally for refresh
            const controller = new AbortController();
            abortControllersRef.current[uploadId] = controller;

            setUploads((prev) =>
                prev.map((u) => (u.id === uploadId ? { ...u, state: 'uploading' } : u))
            );

            await uploadFile(projectId, file, getToken, {
                signal: controller.signal,
                onProgress: (percent) => {
                    setUploads((prev) =>
                        prev.map((u) =>
                            u.id === uploadId ? { ...u, progress: Math.round(percent) } : u
                        )
                    );
                },
                onStateChange: (state, error) => {
                    setUploads((prev) =>
                        prev.map((u) =>
                            u.id === uploadId ? { ...u, state, error: error || null } : u
                        )
                    );
                },
            });

            toast.success(`${file.name} uploaded successfully`);
            callbacks.onComplete?.({ file, uploadId });

            // Remove from list after delay
            setTimeout(() => {
                setUploads((prev) => prev.filter((u) => u.id !== uploadId));
                delete abortControllersRef.current[uploadId];
            }, 5000); // Increased delay to 5s so user sees it completed even after nav
        } catch (error) {
            console.error('Upload error:', error);
            if (error.message !== 'Upload cancelled') {
                toast.error(`Failed to upload ${file.name}: ${error.message}`);
                callbacks.onError?.({ file, error, uploadId });
            }

            setUploads((prev) =>
                prev.map((u) =>
                    u.id === uploadId ? { ...u, state: 'error', error: error.message } : u
                )
            );
        }
    }, [getToken]);

    const cancelUpload = useCallback((uploadId) => {
        const controller = abortControllersRef.current[uploadId];
        if (controller) {
            controller.abort();
            delete abortControllersRef.current[uploadId];
        }

        setUploads((prev) =>
            prev.map((u) =>
                u.id === uploadId ? { ...u, state: 'cancelled', error: 'Cancelled by user' } : u
            )
        );

        setTimeout(() => {
            setUploads((prev) => prev.filter((u) => u.id !== uploadId));
        }, 2000);
    }, []);

    const retryUpload = useCallback((uploadIdOrObj) => {
        // Handle both string ID and event/object
        const uploadId = typeof uploadIdOrObj === 'object' ? uploadIdOrObj.id : uploadIdOrObj;

        const upload = uploads.find(u => u.id === uploadId);
        if (upload) {
            const { file, projectId } = upload;
            setUploads((prev) => prev.filter((u) => u.id !== uploadId));
            startUpload(file, projectId);
        }
    }, [uploads, startUpload]);

    const removeUpload = useCallback((uploadId) => {
        setUploads((prev) => prev.filter((u) => u.id !== uploadId));
        if (abortControllersRef.current[uploadId]) {
            delete abortControllersRef.current[uploadId];
        }
    }, []);

    const value = {
        uploads,
        startUpload,
        cancelUpload,
        retryUpload,
        removeUpload
    };

    return (
        <UploadContext.Provider value={value}>
            {children}
        </UploadContext.Provider>
    );
};
