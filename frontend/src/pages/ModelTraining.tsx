import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout";
import { TrainingChart, TrainingSkeleton } from "@/components/training";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Square, Settings2, Clock, Database, Layers, Zap, ArrowLeft,
  Download, Camera, X, CheckCircle2, Loader2, GitCompare, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

export default function ModelTraining() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);

  useEffect(() => {
    const loadTimer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setIsComplete(true);
          clearInterval(interval);
          return 100;
        }
        return prev + 4;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  const handleDownload = () => {
    // Demo: Create a fake model file download
    const modelData = {
      name: "sales_predictor_v3",
      type: "XGBoost Classifier",
      accuracy: 0.925,
      features: 21,
      samples: 14203,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(modelData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "model_sales_predictor_v3.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout title="">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        {/* Header section */}
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </Link>
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: !isComplete ? 360 : 0 }}
                transition={{ duration: 2, repeat: !isComplete ? Infinity : 0, ease: "linear" }}
                className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center"
              >
                {isComplete ? (
                  <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
                ) : (
                  <Zap className="w-6 h-6 text-primary-foreground" />
                )}
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">sales_predictor_v3</h1>
                <p className="text-muted-foreground">
                  {isComplete ? "Training complete!" : "Finding patterns in 14,203 records..."}
                </p>
              </div>
            </div>
          </div>

          {!isComplete && (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="rounded-lg border-border">
                <Settings2 className="w-4 h-4 mr-2" />
                Config
              </Button>
              <Button variant="destructive" size="sm" className="rounded-lg">
                <Square className="w-4 h-4 mr-2" />
                Stop Training
              </Button>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <Card className={`border-primary/30 ${isComplete ? "bg-primary/10" : "bg-primary/5"}`}>
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline" 
                  className={`${isComplete ? "bg-primary/20 text-primary" : "bg-primary/15 text-primary"} border-primary/30`}
                >
                  {isComplete ? "Complete" : "Training"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {isComplete ? "50/50 epochs" : `Epoch ${Math.floor(progress / 2)}/50`}
                </span>
              </div>
              <span className="text-2xl font-bold text-primary">{progress}%</span>
            </div>
            <div className="progress-accent">
              <motion.div 
                className="progress-accent-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="flex items-center gap-8 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{isComplete ? "Completed" : "ETA: 12m 34s"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                <span>14,203 samples</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>XGBoost Classifier</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Training configuration summary */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Learning Rate", value: "0.01" },
            { label: "Batch Size", value: "64" },
            { label: "Max Depth", value: "8" },
            { label: "Estimators", value: "200" },
          ].map((config, index) => (
            <motion.div
              key={config.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Card className="border-border bg-card/50">
                <CardContent className="py-4">
                  <p className="text-xs text-muted-foreground mb-1">{config.label}</p>
                  <p className="text-xl font-semibold text-foreground">{config.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts section */}
        {isLoading ? (
          <TrainingSkeleton />
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <TrainingChart />
          </motion.div>
        )}

        {/* Completion Actions */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-4"
            >
              <Card className="p-6 border-primary/20 bg-primary/5">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Model Ready!</h2>
                  <p className="text-muted-foreground">
                    Your model achieved 92.5% accuracy on the validation set.
                  </p>
                </div>

                <div className="flex justify-center gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleDownload}
                    className="gap-2 min-w-[160px]"
                  >
                    <Download className="w-5 h-5" />
                    Download Model
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => setShowTestModal(true)}
                    className="gap-2 min-w-[160px]"
                  >
                    <Camera className="w-5 h-5" />
                    Test with Camera
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => setShowCompareModal(true)}
                    className="gap-2 min-w-[160px]"
                  >
                    <GitCompare className="w-5 h-5" />
                    Compare & Test
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Camera Test Modal */}
      <CameraTestModal 
        open={showTestModal} 
        onOpenChange={setShowTestModal} 
      />

      {/* Compare & Test Modal */}
      <CompareTestModal
        open={showCompareModal}
        onOpenChange={setShowCompareModal}
      />
    </AppLayout>
  );
}

// Camera Test Modal Component
function CameraTestModal({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setPrediction(null);
  };

  const analyzeFrame = () => {
    setIsAnalyzing(true);
    // Demo: Simulate analysis
    setTimeout(() => {
      const predictions = [
        { label: "High Churn Risk", confidence: 0.87 },
        { label: "Low Churn Risk", confidence: 0.92 },
        { label: "Medium Churn Risk", confidence: 0.76 },
        { label: "Customer Retained", confidence: 0.94 },
      ];
      const result = predictions[Math.floor(Math.random() * predictions.length)];
      setPrediction(result.label);
      setConfidence(result.confidence);
      setIsAnalyzing(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Test Model with Camera
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera View */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm opacity-70">Starting camera...</p>
                </div>
              </div>
            )}

            {/* Prediction Overlay */}
            <AnimatePresence>
              {prediction && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-4 left-4 right-4"
                >
                  <div className="bg-background/90 backdrop-blur rounded-lg p-4 border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Prediction</p>
                        <p className="text-lg font-bold">{prediction}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <p className="text-lg font-bold text-primary">
                          {(confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4">
            <Button
              onClick={analyzeFrame}
              disabled={!isStreaming || isAnalyzing}
              size="lg"
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Analyze Frame
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Point your camera at relevant data and click "Analyze Frame" to test the model.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compare & Test Modal Component
function CompareTestModal({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const [isComparing, setIsComparing] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  
  // Test images for demo
  const testImages = [
    { id: 1, name: "Customer Profile A", src: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=300&fit=crop" },
    { id: 2, name: "Customer Profile B", src: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=300&fit=crop" },
    { id: 3, name: "Customer Profile C", src: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=300&fit=crop" },
  ];
  
  const [selectedImage, setSelectedImage] = useState(testImages[0]);
  
  const [yourModelResult, setYourModelResult] = useState({
    prediction: "",
    confidence: 0,
    latency: 0,
    processing: false,
    done: false,
  });
  
  const [openaiResult, setOpenaiResult] = useState({
    prediction: "",
    confidence: 0,
    latency: 0,
    processing: false,
    done: false,
  });

  useEffect(() => {
    if (open) {
      setHasResults(false);
      setYourModelResult({ prediction: "", confidence: 0, latency: 0, processing: false, done: false });
      setOpenaiResult({ prediction: "", confidence: 0, latency: 0, processing: false, done: false });
    }
  }, [open]);

  const runComparison = () => {
    setIsComparing(true);
    setHasResults(false);
    
    // Reset results
    setYourModelResult({ prediction: "", confidence: 0, latency: 0, processing: true, done: false });
    setOpenaiResult({ prediction: "", confidence: 0, latency: 0, processing: true, done: false });

    // Simulate Your Model (faster, local)
    const yourModelLatency = 180 + Math.random() * 120; // 180-300ms
    setTimeout(() => {
      const predictions = ["High Churn Risk", "Low Churn Risk", "Medium Churn Risk"];
      setYourModelResult({
        prediction: predictions[Math.floor(Math.random() * predictions.length)],
        confidence: 0.88 + Math.random() * 0.07,
        latency: Math.round(yourModelLatency),
        processing: false,
        done: true,
      });
    }, yourModelLatency);

    // Simulate OpenAI GPT-4 Vision (slower, API call)
    const openaiLatency = 800 + Math.random() * 700; // 800-1500ms
    setTimeout(() => {
      const predictions = ["High Churn Risk", "Low Churn Risk", "Medium Churn Risk"];
      setOpenaiResult({
        prediction: predictions[Math.floor(Math.random() * predictions.length)],
        confidence: 0.91 + Math.random() * 0.06,
        latency: Math.round(openaiLatency),
        processing: false,
        done: true,
      });
      setIsComparing(false);
      setHasResults(true);
    }, openaiLatency);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            Compare Your Model vs OpenAI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Test Image Selection */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select a test image:</p>
            <div className="grid grid-cols-3 gap-3">
              {testImages.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img)}
                  className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage.id === img.id 
                      ? "border-primary ring-2 ring-primary/20" 
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  <img 
                    src={img.src} 
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-xs font-medium">{img.name}</p>
                  </div>
                  {selectedImage.id === img.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Image Preview */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            <img 
              src={selectedImage.src} 
              alt={selectedImage.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="bg-background/80 backdrop-blur">
                {selectedImage.name}
              </Badge>
            </div>
          </div>

          {/* Comparison Results */}
          <div className="grid grid-cols-2 gap-4">
            {/* Your Model */}
            <Card className="border-primary/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Your Model</h3>
                    <p className="text-xs text-muted-foreground">sales_predictor_v3</p>
                  </div>
                </div>

                {yourModelResult.processing && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </div>
                    <Progress value={65} className="h-2" />
                  </div>
                )}

                {yourModelResult.done && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Prediction</p>
                      <p className="font-bold text-lg">{yourModelResult.prediction}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-xs text-muted-foreground">Confidence</p>
                        <p className="font-semibold text-primary">
                          {(yourModelResult.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-xs text-muted-foreground">Latency</p>
                        <p className="font-semibold text-green-500">
                          {yourModelResult.latency}ms
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!yourModelResult.processing && !yourModelResult.done && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Click "Run Comparison" to start
                  </p>
                )}
              </CardContent>
            </Card>

            {/* OpenAI Model */}
            <Card className="border-purple-500/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">OpenAI</h3>
                    <p className="text-xs text-muted-foreground">GPT-4 Vision</p>
                  </div>
                </div>

                {openaiResult.processing && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Calling API...
                    </div>
                    <Progress value={35} className="h-2" />
                  </div>
                )}

                {openaiResult.done && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Prediction</p>
                      <p className="font-bold text-lg">{openaiResult.prediction}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-xs text-muted-foreground">Confidence</p>
                        <p className="font-semibold text-purple-500">
                          {(openaiResult.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-xs text-muted-foreground">Latency</p>
                        <p className="font-semibold text-orange-500">
                          {openaiResult.latency}ms
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!openaiResult.processing && !openaiResult.done && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Click "Run Comparison" to start
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary if both done */}
          <AnimatePresence>
            {hasResults && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-muted/50">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="font-medium">Comparison Complete</span>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-muted-foreground">Speed advantage: </span>
                          <span className="font-bold text-green-500">
                            {((openaiResult.latency / yourModelResult.latency) - 1).toFixed(1)}x faster
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Agreement: </span>
                          <span className="font-bold">
                            {yourModelResult.prediction === openaiResult.prediction ? "✓ Same" : "Different"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className="flex justify-center">
            <Button
              onClick={runComparison}
              disabled={isComparing}
              size="lg"
              className="gap-2 min-w-[200px]"
            >
              {isComparing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <GitCompare className="w-5 h-5" />
                  Run Comparison
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Compare your trained model's predictions against OpenAI's GPT-4 Vision on the selected test image.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
