// app/finance/page.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
// Remove unused import: import { type ToastProps } from "@/components/ui/toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Send,
  ChevronDown,
  Paperclip,
  ChartLine,
  ChartArea,
  // Removed unused: FileInput,
  MessageCircleQuestion,
  ChartColumnBig,
} from "lucide-react";
import FilePreview from "@/components/FilePreview";
import { ChartRenderer } from "@/components/ChartRenderer";
import { useToast, toast } from "@/hooks/use-toast"; // Import useToast as well if needed elsewhere, keep toast
import { type ToasterToast } from "@/hooks/use-toast"; // *** FIX: Import ToasterToast type ***
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChartData } from "@/types/chart";
import {
  readFileAsText,
  readFileAsBase64,
  readFileAsPDFText,
} from "@/utils/fileHandling";

// Types
interface Message {
  id: string;
  role: string;
  content: string;
  hasToolUse?: boolean;
  file?: {
    base64: string;
    fileName: string;
    mediaType: string;
    isText?: boolean;
  };
  chartData?: ChartData;
}

type Model = {
  id: string;
  name: string;
};

interface FileUpload {
  base64: string;
  fileName: string;
  mediaType: string;
  isText?: boolean;
  fileSize?: number;
}

const models: Model[] = [
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
  { id: "claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet" },
];

// Updated APIResponse interface
interface APIResponse {
  content: string;
  hasToolUse: boolean;
  toolUse?: {
    type: "tool_use";
    id: string;
    name: string;
    input: ChartData; // Assuming input matches ChartData structure
  };
  chartData?: ChartData;
}

interface MessageComponentProps {
  message: Message;
}

// SafeChartRenderer
const SafeChartRenderer: React.FC<{ data: ChartData }> = ({ data }) => {
  try {
    return (
      <div className="w-full h-full p-6 flex flex-col">
        <div className="w-full max-w-4xl flex-1 mx-auto"> {/* Constrain width */}
          <ChartRenderer data={data} />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Chart rendering error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return (
      <div className="text-red-500 p-4">Error rendering chart: {errorMessage}</div>
    );
  }
};

// MessageComponent
const MessageComponent: React.FC<MessageComponentProps> = ({ message }) => {
  return (
    <div className="flex items-start gap-3 w-full">
      {message.role === "assistant" && (
        <Avatar className="w-8 h-8 border shrink-0">
          <AvatarImage src="/ant-logo.svg" alt="AI Assistant Avatar" />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
      )}
      {message.role === "user" && (
        <div className="flex-grow"></div> /* Spacer for user messages */
      )}

      <div
        className={`flex flex-col max-w-[80%] ${
          message.role === "user" ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`p-3 rounded-lg text-sm shadow-sm ${
            message.role === "user"
              ? "bg-primary text-primary-foreground"
              : "bg-muted border"
          }`}
        >
          {message.content === "thinking" ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1" />
              {message.hasToolUse ? (
                 <span>Generating chart...</span>
              ) : (
                <span>Thinking...</span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {message.hasToolUse && message.role === 'assistant' && (
                <Badge variant="secondary" className="inline-flex self-start text-xs px-2 py-0.5">
                  <ChartLine className="w-3 h-3 mr-1" /> Generated Chart
                </Badge>
              )}
              <span className="whitespace-pre-wrap break-words">{message.content}</span>
            </div>
          )}
        </div>
        {message.file && (
          <div className={`mt-1.5 ${message.role === "user" ? "self-end" : "self-start"}`}>
            <FilePreview file={message.file} size="small" />
          </div>
        )}
      </div>
       {message.role === "assistant" && (
        <div className="flex-grow"></div> /* Spacer for assistant messages */
      )}
       {message.role === "user" && (
         <Avatar className="w-8 h-8 border shrink-0">
           {/* <AvatarImage src={user?.imageUrl} /> */}
           <AvatarFallback>U</AvatarFallback>
         </Avatar>
       )}
    </div>
  );
};


// ChartPagination
const ChartPagination = ({
  total,
  current,
  onDotClick,
}: {
  total: number;
  current: number;
  onDotClick: (index: number) => void;
}) => (
  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
    {Array.from({ length: total }).map((_, i) => (
      <button
        key={i}
        onClick={() => onDotClick(i)}
        aria-label={`Go to chart ${i + 1}`}
        className={`w-2 h-2 rounded-full transition-all duration-200 ease-in-out ${
          i === current
            ? "bg-primary scale-125 ring-2 ring-primary/30"
            : "bg-muted hover:bg-primary/50 scale-100"
        }`}
      />
    ))}
  </div>
);


// --- Main AIChat Component ---
export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(
    models[1].id // Default to Sonnet 3.5
  );
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUpload, setCurrentUpload] = useState<FileUpload | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentChartIndex, setCurrentChartIndex] = useState(0);

  // Scroll chat to bottom effect
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [messages, isLoading]);

  // Debounced scroll handler for charts (Consider adding actual debouncing if performance becomes an issue)
  const handleChartScroll = useCallback(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const { scrollTop, clientHeight } = container;
    const newIndex = Math.round((scrollTop + clientHeight / 2) / clientHeight);
    const chartMessages = messages.filter(m => m.chartData);
    const boundedIndex = Math.max(0, Math.min(newIndex, chartMessages.length - 1));

    if (boundedIndex !== currentChartIndex) {
       setCurrentChartIndex(boundedIndex);
    }
  }, [messages, currentChartIndex]); // Dependencies

  // *** FIX: Wrap scrollToChart in useCallback and add dependencies ***
  const scrollToChart = useCallback((index: number) => {
    const container = chartContainerRef.current;
    if (!container) return;

    const chartMessages = messages.filter(m => m.chartData); // Depends on messages
    if (index >= 0 && index < chartMessages.length) {
      const targetScroll = index * container.clientHeight;
      container.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });
      // Setting index here might conflict with scroll handler, let scroll handler manage it mostly
      // setCurrentChartIndex(index);
    }
  }, [messages]); // Dependency: messages

  // Scroll to the newest chart when a new one is added
  useEffect(() => {
    const chartMessages = messages.filter((m) => m.chartData);
    const lastChartIndex = chartMessages.length - 1;

    if (messages.length > 0 && messages[messages.length - 1].chartData && lastChartIndex >= 0) {
        const timer = setTimeout(() => scrollToChart(lastChartIndex), 150);
        return () => clearTimeout(timer);
    }
  // *** FIX: Add memoized scrollToChart to dependency array ***
  }, [messages, scrollToChart]);

 // --- File Handling ---

 // *** FIX: Define interface matching the return type of toast() ***
 interface ToastControl {
   id: string;
   dismiss: () => void;
   update: (props: ToasterToast) => void; // Expects full ToasterToast now
 }

 const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // *** FIX: Use the corrected ToastControl interface type ***
    let loadingToastControl: ToastControl | undefined;

    // Show processing toast immediately
    loadingToastControl = toast({ // *** This assignment (line ~305) should now pass type checking ***
      title: "Processing File",
      description: `Working on ${file.name}...`,
      duration: 999999, // Indefinite duration
    });

    try {
      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf";
      let base64Data = "";
      let isText = false;
      let fileContentDescription = "";

      if (isImage) {
        base64Data = await readFileAsBase64(file);
        isText = false;
        fileContentDescription = "Image data loaded";
      } else if (isPDF) {
         try {
           if (loadingToastControl) {
              // *** FIX: Use type assertion for partial update object ***
              loadingToastControl.update({
                  title: "Parsing PDF",
                  description: "Extracting text content..."
              } as ToasterToast); // Assert type here
           }
           const pdfText = await readFileAsPDFText(file);
           base64Data = btoa(unescape(encodeURIComponent(pdfText)));
           isText = true;
           fileContentDescription = "PDF text extracted";
         } catch (error) {
           console.error("Failed to parse PDF:", error);
           throw new Error("Unable to extract text from the PDF. It might be image-based or corrupted.");
         }
      } else {
         try {
           const textContent = await readFileAsText(file);
           if (textContent.includes('\uFFFD') && !file.type.startsWith('text/')) {
              throw new Error("File seems to be binary, not text-based.");
           }
           base64Data = btoa(unescape(encodeURIComponent(textContent)));
           isText = true;
           fileContentDescription = "Text content loaded";
         } catch (error) {
           console.error("Failed to read as text:", error);
           throw new Error("Unsupported file type. Please upload text files (CSV, TXT), PDFs, or images.");
         }
      }

      const maxSize = 10 * 1024 * 1024; // 10 MB
      if (file.size > maxSize) {
          throw new Error(`File size exceeds the limit of ${maxSize / (1024*1024)}MB.`);
      }

      setCurrentUpload({
        base64: base64Data,
        fileName: file.name,
        mediaType: isText ? "text/plain" : file.type,
        isText,
        fileSize: file.size
      });

      if (loadingToastControl) {
        // *** FIX: Use type assertion for partial update object ***
        loadingToastControl.update({
           title: "File Ready",
           description: `${file.name} (${fileContentDescription}). Add prompt.`,
           variant: "default",
           duration: 5000
        } as ToasterToast); // Assert type here
        loadingToastControl = undefined; // *** FIX: Clear control after final update ***
      }

    } catch (error) {
      console.error("Error processing file:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to process the file";

      if (loadingToastControl) {
          // *** FIX: Use type assertion for partial update object ***
          loadingToastControl.update({
              title: "Upload Failed",
              description: errorMessage,
              variant: "destructive",
              duration: 8000
          } as ToasterToast); // Assert type here
          loadingToastControl = undefined; // *** FIX: Clear control after error update ***
      } else {
          toast({ title: "Upload Failed", description: errorMessage, variant: "destructive", duration: 8000 });
      }
      setCurrentUpload(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
       // *** FIX: Removed faulty reference to loadingToastId ***
       // Optional: Dismiss if control still exists (unexpected error before update)?
       // if (loadingToastControl) {
       //   loadingToastControl.dismiss();
       // }
    }
  };

 // --- Form Submission ---
  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!input.trim() && !currentUpload) {
        toast({ title: "Input required", description: "Please type a message or upload a file.", variant: "destructive"});
        return;
    }
    if (isLoading) return;

    setIsLoading(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      file: currentUpload || undefined,
    };

    const thinkingContent = currentUpload ? `Analyzing ${currentUpload.fileName}...` : "Thinking...";
    const thinkingMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "thinking",
      // Display content depends on internal 'thinking' state later
    };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);

    setInput("");
    setCurrentUpload(null);

    const messagesForApi = messages.concat(userMessage);

    const requestBody = {
      messages: messagesForApi.map(msg => ({
          role: msg.role,
          content: msg.content,
      })),
      fileData: userMessage.file ? {
           base64: userMessage.file.base64,
           mediaType: userMessage.file.mediaType,
           isText: userMessage.file.isText,
           fileName: userMessage.file.fileName,
      } : null,
      model: selectedModel,
    };

    try {
      const response = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (parseError) {
            errorData = { error: "API Error", details: `Request failed with status: ${response.status} ${response.statusText}` };
        }
        console.error("API Error Response:", errorData);
        throw new Error(errorData.details || errorData.error || `HTTP error ${response.status}`);
      }

      const data: APIResponse = await response.json();

      setMessages((prev) => {
        const newMessages = [...prev];
        const thinkingIndex = newMessages.findIndex(m => m.content === 'thinking' && m.role === 'assistant');
        if (thinkingIndex !== -1) {
           newMessages[thinkingIndex] = {
             id: newMessages[thinkingIndex].id,
             role: "assistant",
             content: data.content || (data.hasToolUse ? "Generated a chart based on your request." : "I received an empty response."),
             hasToolUse: data.hasToolUse || !!data.toolUse,
             chartData: data.chartData || (data.toolUse?.input),
           };
        } else {
             newMessages.push({
               id: crypto.randomUUID(),
               role: "assistant",
               content: data.content || (data.hasToolUse ? "Generated a chart based on your request." : "I received an empty response."),
               hasToolUse: data.hasToolUse || !!data.toolUse,
               chartData: data.chartData || (data.toolUse?.input),
             });
        }
        return newMessages;
      });

    } catch (error) {
      console.error("Submit Error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setMessages((prev) => {
        const newMessages = [...prev];
         const thinkingIndex = newMessages.findIndex(m => m.content === 'thinking' && m.role === 'assistant');
         if (thinkingIndex !== -1) {
            newMessages[thinkingIndex] = {
               id: newMessages[thinkingIndex].id,
               role: "assistant",
               content: `Sorry, I encountered an error: ${errorMessage}`,
             };
         } else {
             newMessages.push({
               id: crypto.randomUUID(),
               role: "assistant",
               content: `Sorry, I encountered an error: ${errorMessage}`,
             });
         }
        return newMessages;
      });
       toast({
           title: "Request Failed",
           description: errorMessage,
           variant: "destructive"
       });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle textarea resizing
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = event.target;
    setInput(textarea.value);
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const chartMessages = messages.filter(m => m.chartData);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 h-[calc(100vh-3.5rem)] overflow-hidden">

        {/* Chat Sidebar (Column 1) */}
        <Card className="lg:col-span-1 flex flex-col h-full overflow-hidden">
           <CardHeader className="py-3 px-4 border-b">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8 border">
                        <AvatarImage src="/ant-logo.svg" alt="AI Assistant Avatar" />
                        <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-base font-semibold">
                           Financial Assistant
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Powered by Claude
                        </CardDescription>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs px-2 gap-1">
                        {models.find((m) => m.id === selectedModel)?.name || 'Select Model'}
                        <ChevronDown className="ml-1 h-4 w-4 opacity-70" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    {models.map((model) => (
                        <DropdownMenuItem
                           key={model.id}
                           onSelect={() => setSelectedModel(model.id)}
                           className="text-xs"
                        >
                        {model.name}
                        </DropdownMenuItem>
                    ))}
                    </DropdownMenuContent>
                </DropdownMenu>
             </div>
           </CardHeader>

            {/* Message List */}
           <CardContent
             ref={messagesContainerRef}
             className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
           >
             {messages.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground animate-fade-in-up">
                 <Avatar className="w-10 h-10 mb-4 border">
                   <AvatarImage src="/ant-logo.svg" alt="AI Assistant Avatar" />
                 </Avatar>
                 <h2 className="text-lg font-semibold mb-3 text-foreground">Start Analyzing</h2>
                 <div className="space-y-3 text-sm max-w-xs">
                   <div className="flex items-start gap-3 text-left">
                     <Paperclip className="w-4 h-4 mt-0.5 shrink-0" />
                     <span>Upload a CSV, PDF, or image file using the paperclip icon.</span>
                   </div>
                   <div className="flex items-start gap-3 text-left">
                      <MessageCircleQuestion className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>Ask questions about your data, like "Summarize the key trends" or "Create a bar chart of revenue by quarter".</span>
                   </div>
                    <div className="flex items-start gap-3 text-left">
                      <ChartArea className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>View generated charts and analysis in the right-hand panel.</span>
                   </div>
                 </div>
               </div>
             ) : (
               messages.map((message) => (
                 <div
                   key={message.id}
                   className={`animate-fade-in-up ${
                     message.content === "thinking" ? "opacity-70" : ""
                   }`}
                 >
                   <MessageComponent message={message} />
                 </div>
               ))
             )}
           </CardContent>

            {/* Input Area */}
           <CardFooter className="p-3 border-t bg-background">
             <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
                {currentUpload && (
                  <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                    <FilePreview
                        file={currentUpload}
                        size="small"
                     />
                      <span className="text-xs text-muted-foreground truncate mx-2 flex-1">{currentUpload.fileName}</span>
                  </div>
                 )}
               <div className="flex items-end space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isUploading}
                    aria-label="Attach file"
                  >
                   {isUploading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" /> : <Paperclip className="h-5 w-5" />}
                  </Button>
                  <Textarea
                    ref={input => { if (input) { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 200)}px`; } }} // Adjusted ref callback
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your data or file..."
                    disabled={isLoading}
                    className="flex-1 resize-none min-h-[40px] max-h-[200px] text-sm py-2 px-3 leading-tight"
                    rows={1}
                    aria-label="Chat message input"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    disabled={isLoading || isUploading || (!input.trim() && !currentUpload)}
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
               </div>
             </form>
             <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                accept=".csv,.txt,.md,.json,application/pdf,image/*"
              />
           </CardFooter>
        </Card>

       {/* Content Area (Charts/Analysis) */}
        <Card className="lg:col-span-2 flex flex-col h-full overflow-hidden relative">
           {chartMessages.length > 0 ? (
             <>
               <CardHeader className="py-3 px-4 border-b shrink-0">
                 <CardTitle className="text-base font-semibold">Analysis & Visualizations</CardTitle>
                 <CardDescription className="text-xs">Scroll through generated charts.</CardDescription>
               </CardHeader>
               <CardContent
                 ref={chartContainerRef}
                 className="flex-1 overflow-y-auto scroll-smooth snap-y snap-mandatory p-0"
                 onScroll={handleChartScroll}
               >
                 {chartMessages.map((message, index) => (
                     <div
                       key={`chart-${message.id}`}
                       className="w-full h-full flex-shrink-0 snap-start snap-always flex items-center justify-center p-4"
                     >
                       <SafeChartRenderer data={message.chartData!} />
                     </div>
                   ),
                 )}
               </CardContent>
               {chartMessages.length > 1 && (
                 <ChartPagination
                   total={chartMessages.length}
                   current={currentChartIndex}
                   onDotClick={scrollToChart} // Use the memoized function
                 />
               )}
             </>
           ) : (
             <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <ChartColumnBig className="w-12 h-12 text-muted-foreground mb-4" />
                 <CardTitle className="text-lg font-semibold mb-2">Charts Appear Here</CardTitle>
                 <CardDescription className="text-sm max-w-xs text-muted-foreground">
                    As you upload files and ask for analysis, visualizations like bar, line, area, and pie charts will be displayed in this area.
                 </CardDescription>
                 <div className="flex flex-wrap justify-center gap-2 mt-6">
                    <Badge variant="outline" className="text-xs">Bar Charts</Badge>
                    <Badge variant="outline" className="text-xs">Area Charts</Badge>
                    <Badge variant="outline" className="text-xs">Line Charts</Badge>
                    <Badge variant="outline" className="text-xs">Pie Charts</Badge>
                 </div>
             </CardContent>
           )}
        </Card>
    </div>
  );
}