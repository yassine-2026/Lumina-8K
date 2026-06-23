/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CloudUpload as UploadCloud, Image as ImageIcon, Video, Wand2, Sparkles, AlertCircle, Download, CircleCheck as CheckCircle2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import clsx from 'clsx';
import type { EnhancementType, PredictionState, EnhancementOption } from './types';

const ENHANCEMENT_OPTIONS: EnhancementOption[] = [
  { id: 'image-upscale', title: 'Upscale Image (8K)', description: 'Enhance details and upscale up to 8K resolution.', mediaType: 'image' },
  { id: 'face-restore', title: 'Restore Faces', description: 'Fix blurry faces and enhance facial details automatically.', mediaType: 'image' },
  { id: 'colorize', title: 'Colorize Photo', description: 'Add realistic colors to old black and white photos.', mediaType: 'image' },
  { id: 'video-upscale', title: 'Upscale Video', description: 'Enhance video resolution, remove noise and sharpen details.', mediaType: 'video' },
  { id: 'rife', title: 'Smooth Video (FPS)', description: 'Interpolate frames to make video motion silky smooth.', mediaType: 'video' },
];

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedEnhancement, setSelectedEnhancement] = useState<EnhancementType | null>(null);
  const [prediction, setPrediction] = useState<PredictionState | null>(null);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);

  React.useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        if (data.missingKeys && data.missingKeys.length > 0) {
          setMissingKeys(data.missingKeys);
        }
      })
      .catch(console.error);
  }, []);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setPrediction(null);
      
      const isVideo = selectedFile.type.startsWith('video/');
      const defaultOption = ENHANCEMENT_OPTIONS.find(opt => opt.mediaType === (isVideo ? 'video' : 'image'));
      if (defaultOption) {
        setSelectedEnhancement(defaultOption.id);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.png', '.jpg', '.webp'],
      'video/*': ['.mp4', '.mov', '.webm'],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    maxFiles: 1,
  } as any);

  const handleEnhance = async () => {
    if (!file || !selectedEnhancement) return;

    try {
      setPrediction({ id: '', status: 'starting', output: null, error: null });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', selectedEnhancement);

      const response = await fetch('/api/enhance', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start enhancement');

      setPrediction({ id: data.predictionId, status: data.status, output: null, error: null });
      pollPrediction(data.predictionId);
    } catch (err: any) {
      setPrediction(prev => prev ? { ...prev, status: 'failed', error: err.message } : null);
    }
  };

  const pollPrediction = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/prediction/${id}`);
        const data = await res.json();

        if (data.status === 'succeeded' || data.status === 'failed' || data.status === 'canceled') {
          clearInterval(interval);
          setPrediction({
            id: data.id,
            status: data.status,
            output: data.output,
            error: data.error,
          });
        } else {
          setPrediction(prev => prev ? { ...prev, status: data.status } : null);
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 2000);
  };

  const isVideo = file?.type?.startsWith('video/');
  const currentOptions = ENHANCEMENT_OPTIONS.filter(opt =>
    !file ? true : opt.mediaType === (isVideo ? 'video' : 'image')
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-indigo-500/30">
      <header className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium tracking-tight text-lg">Lumina 8K</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><ImageIcon className="w-4 h-4" /> Images</span>
            <span className="flex items-center gap-1.5"><Video className="w-4 h-4" /> Videos</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        {missingKeys.length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/20 text-orange-200 p-4 w-full rounded-2xl flex items-center justify-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="text-sm">
              <span className="font-medium">Missing API Keys:</span> Please configure <code className="bg-black/30 px-1 py-0.5 rounded mx-1">{missingKeys.join(', ')}</code> in Vercel Environment Variables.
            </div>
          </div>
        )}

        <div className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-medium tracking-tight bg-gradient-to-br from-white to-gray-500 bg-clip-text text-transparent">
            Absolute Clarity.
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
            Upload any image or video and watch as AI restores lost details, removes noise, and upscales your media up to true 8K resolution.
          </p>
        </div>

        {!prediction?.output ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-6">
              <div
                {...getRootProps()}
                className={clsx(
                  "relative group cursor-pointer aspect-video md:aspect-square flex flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all duration-300 overflow-hidden bg-white/[0.02]",
                  isDragActive ? "border-indigo-500 bg-indigo-500/5" : "border-white/10 hover:border-white/20 hover:bg-white/[0.04]",
                  previewUrl && !isDragActive ? "border-transparent" : ""
                )}
              >
                <input {...getInputProps()} />
                
                {previewUrl ? (
                  isVideo ? (
                    <video src={previewUrl} className="absolute inset-0 w-full h-full object-cover" controls muted />
                  ) : (
                    <img src={previewUrl} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                  )
                ) : (
                  <div className="flex flex-col items-center gap-4 p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="text-base font-medium">Click or drag media here</p>
                      <p className="text-sm text-gray-500 mt-1">Supports JPG, PNG, WEBP, MP4 up to 100MB</p>
                    </div>
                  </div>
                )}

                {previewUrl && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-white font-medium flex items-center gap-2">
                      <UploadCloud className="w-5 h-5" /> Change File
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Enhancement Mode</h3>
                <div className="grid gap-3">
                  {currentOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedEnhancement(opt.id)}
                      disabled={!!prediction && prediction.status !== 'failed'}
                      className={clsx(
                        "text-left p-4 rounded-2xl border transition-all duration-200",
                        selectedEnhancement === opt.id
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10 opacity-70",
                        !!prediction && prediction.status !== 'failed' && "pointer-events-none opacity-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{opt.title}</span>
                        {selectedEnhancement === opt.id && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {file && (
                <div className="pt-4">
                  <button
                    onClick={handleEnhance}
                    disabled={!selectedEnhancement || (!!prediction && prediction.status !== 'failed')}
                    className="w-full h-14 rounded-full bg-white text-black font-medium text-lg flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!prediction || prediction.status === 'failed' ? (
                      <>
                        <Wand2 className="w-5 h-5" /> Enhance Now
                      </>
                    ) : (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full"
                        />
                        Processing... ({prediction.status})
                      </>
                    )}
                  </button>
                </div>
              )}

              {prediction?.error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Enhancement Failed</p>
                    <p className="opacity-80 mt-1">{prediction.error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-medium">Result</h2>
              <button 
                onClick={() => {
                  setFile(null);
                  setPreviewUrl(null);
                  setPrediction(null);
                }}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Enhance Another
              </button>
            </div>

            <div className="rounded-3xl border border-white/10 overflow-hidden bg-white/5 relative aspect-video flex items-center justify-center">
              {isVideo ? (
                <video src={Array.isArray(prediction.output) ? prediction.output[0] : prediction.output} className="w-full h-full object-contain" controls autoPlay loop />
              ) : (
                <ReactCompareSlider
                  itemOne={<ReactCompareSliderImage src={previewUrl!} alt="Before" className="object-contain" />}
                  itemTwo={<ReactCompareSliderImage src={Array.isArray(prediction.output) ? prediction.output[0] : prediction.output} alt="After" className="object-contain" />}
                  className="w-full h-full bg-black"
                />
              )}
            </div>

            <div className="flex justify-center">
               <a 
                href={Array.isArray(prediction.output) ? prediction.output[0] : prediction.output as string}
                download
                target="_blank"
                rel="noreferrer"
                className="h-14 px-8 rounded-full bg-white text-black font-medium text-lg flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
               >
                 <Download className="w-5 h-5" /> Download Full Quality
               </a>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
