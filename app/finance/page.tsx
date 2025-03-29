// app/finance/page.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { type ToastProps } from "@/components/ui/toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Send,
  ChevronDown,
  Paperclip,
  ChartLine,
  ChartArea,
  FileInput,
  MessageCircleQuestion,
  ChartColumnBig,
} from "lucide-react";
import FilePreview from "@/components/FilePreview";
import { ChartRenderer } from "@/components/ChartRenderer";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChartData } from "@/types/chart";
// Note: TopNavBar is removed from here as it's now in the root layout
import {
  readFileAsText,
  readFileAsBase64,
  readFileAsPDFText,
} from "@/utils/fileHandling";

// Types (keep existing)
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

// Updated APIResponse interface (keep existing)
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

// SafeChartRenderer (keep existing)
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

// MessageComponent (keep existing)
const MessageComponent: React.FC<MessageComponentProps> = ({ message }) => {
  // console.log("Rendering message:", message.id, "Has chart:", !!message.chartData);
  return (
    <div className="flex items-start gap-3 w-full"> {/* Use gap-3 for slightly more space */}
      {message.role === "assistant" && (
        <Avatar className="w-8 h-8 border shrink-0"> {/* Added shrink-0 */}
          <AvatarImage src="/ant-logo.svg" alt="AI Assistant Avatar" />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
      )}
      {message.role === "user" && (
        <div className="flex-grow"></div> /* Spacer for user messages */
      )}

      <div
        className={`flex flex-col max-w-[80%] ${ // Allow slightly wider messages
          message.role === "user" ? "items-end" : "items-start" // Align content within the bubble
        }`}
      >
        <div
          className={`p-3 rounded-lg text-sm shadow-sm ${ // Use shadow-sm, adjust text size
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
            // Render message content with potential tool use badge
            <div className="flex flex-col gap-1">
              {message.hasToolUse && message.role === 'assistant' && (
                <Badge variant="secondary" className="inline-flex self-start text-xs px-2 py-0.5">
                  <ChartLine className="w-3 h-3 mr-1" /> Generated Chart
                </Badge>
              )}
              {/* Use whitespace-pre-wrap to respect newlines from the AI */}
              <span className="whitespace-pre-wrap break-words">{message.content}</span>
            </div>
          )}
        </div>
        {/* Render file preview below the message bubble */}
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
         <Avatar className="w-8 h-8 border shrink-0"> {/* Added shrink-0 */}
           {/* Consider using Clerk's user prop here if available */}
           {/* <AvatarImage src={user?.imageUrl} /> */}
           <AvatarFallback>U</AvatarFallback>
         </Avatar>
       )}
    </div>
  );
};


// ChartPagination (keep existing)
const ChartPagination = ({
  total,
  current,
  onDotClick,
}: {
  total: number;
  current: number;
  onDotClick: (index: number) => void;
}) => (
  // Position fixed relative to the chart container might be better
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
  const messagesContainerRef = useRef<HTMLDivElement>(null); // Ref for the messages container
  const chartContainerRef = useRef<HTMLDivElement>(null); // Ref for the chart container
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUpload, setCurrentUpload] = useState<FileUpload | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentChartIndex, setCurrentChartIndex] = useState(0);

  // Scroll chat to bottom effect
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      // Scroll down when messages change or loading starts/stops
      requestAnimationFrame(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [messages, isLoading]); // Trigger on messages change and loading state

  // Debounced scroll handler for charts
  const handleChartScroll = useCallback(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const { scrollTop, clientHeight } = container;
    // Calculate index based on center of the viewport
    const newIndex = Math.round((scrollTop + clientHeight / 2) / clientHeight);
    // Ensure index is within bounds
    const chartMessages = messages.filter(m => m.chartData);
    const boundedIndex = Math.max(0, Math.min(newIndex, chartMessages.length - 1));

    if (boundedIndex !== currentChartIndex) {
       // console.log(`Chart index changed to: ${boundedIndex}`);
       setCurrentChartIndex(boundedIndex);
    }
  }, [messages, currentChartIndex]); // Dependencies

  // Scroll to a specific chart index
  const scrollToChart = (index: number) => {
    const container = chartContainerRef.current;
    if (!container) return;

    const chartMessages = messages.filter(m => m.chartData);
    if (index >= 0 && index < chartMessages.length) {
      const targetScroll = index * container.clientHeight; // Assumes each chart takes full height
      container.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });
      // setCurrentChartIndex(index); // Update index immediately for pagination UI
    }
  };

  // Scroll to the newest chart when a new one is added
  useEffect(() => {
    const chartMessages = messages.filter((m) => m.chartData);
    const lastChartIndex = chartMessages.length - 1;

    // Check if the last message added was a chart
    if (messages.length > 0 && messages[messages.length - 1].chartData && lastChartIndex >= 0) {
        // console.log("New chart added, scrolling to index:", lastChartIndex);
        // Use timeout to allow DOM update before scrolling
        const timer = setTimeout(() => scrollToChart(lastChartIndex), 150);
        return () => clearTimeout(timer);
    }
  }, [messages]); // Dependency on messages array

 // --- File Handling (keep existing) ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // Define interface for clarity (can be placed outside function)
    interface ToastControl {
      id: string;
      dismiss: () => void;
      update: (props: Partial<ToastProps & { title?: React.ReactNode; description?: React.ReactNode }>) => void;
    }
    // Store the whole control object
    let loadingToastControl: ToastControl | undefined; // Use string for toast ID

    // Show processing toast immediately
    // Store the returned control object
    loadingToastControl = toast({
      title: "Processing File",
      description: `Working on ${file.name}...`,
      duration: 999999, // Indefinite duration
    }); // Get the ID

    try {
      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf";
      let base64Data = "";
      let isText = false;
      let fileContentDescription = ""; // For success message

      if (isImage) {
        base64Data = await readFileAsBase64(file);
        isText = false;
        fileContentDescription = "Image data loaded";
      } else if (isPDF) {
         try {
           // Update toast for PDF parsing
           if (loadingToastControl) {
              loadingToastControl.update({ // Use the update method
                  // No need to pass ID here, update knows its target
                  title: "Parsing PDF",
                  description: "Extracting text content..."
              });
           }
           const pdfText = await readFileAsPDFText(file);
           base64Data = btoa(unescape(encodeURIComponent(pdfText))); // Use unescape for broader compatibility
           isText = true;
           fileContentDescription = "PDF text extracted";
         } catch (error) {
           console.error("Failed to parse PDF:", error);
           throw new Error("Unable to extract text from the PDF. It might be image-based or corrupted."); // Throw specific error
         }
      } else {
         // Try reading as text for common types like CSV, TXT, MD, etc.
         try {
           const textContent = await readFileAsText(file);
           // Basic check if it looks like binary data (might need refinement)
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

      // Check file size (example: limit to 10MB)
      const maxSize = 10 * 1024 * 1024; // 10 MB
      if (file.size > maxSize) {
          throw new Error(`File size exceeds the limit of ${maxSize / (1024*1024)}MB.`);
      }

      setCurrentUpload({
        base64: base64Data,
        fileName: file.name,
        mediaType: isText ? "text/plain" : file.type, // Use text/plain for consistency
        isText,
        fileSize: file.size
      });

      // Update toast to success
      if (loadingToastControl) {
        loadingToastControl.update({
           // No need for id here
           title: "File Ready",
           description: `${file.name} (${fileContentDescription}). Add prompt.`,
           variant: "default",
           duration: 5000
        });
        loadingToastControl = undefined; // Clear control after final update
    } // Clear the ID

    } catch (error) {
      console.error("Error processing file:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to process the file";
      // Update toast to error or show new error toast
      if (loadingToastControl) {
          loadingToastControl.update({
              // No need for id here
              title: "Upload Failed",
              description: errorMessage,
              variant: "destructive",
              duration: 8000
          });
          loadingToastControl = undefined; // Clear control after error update
      } else {
          // Fallback if initial toast failed
          toast({ title: "Upload Failed", description: errorMessage, variant: "destructive", duration: 8000 });
      }
      setCurrentUpload(null); // Clear upload state on error
    } finally {
      setIsUploading(false);
      // Clear the file input value so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
       // Dismiss any lingering loading toast if something went wrong before update
       if (loadingToastId) {
           toast({ dismiss: true, id: loadingToastId });
       }
    }
  };

 // --- Form Submission (keep existing core logic) ---
  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault(); // Prevent default form submission if called from form
    if (!input.trim() && !currentUpload) {
        toast({ title: "Input required", description: "Please type a message or upload a file.", variant: "destructive"});
        return;
    }
    if (isLoading) return;

    setIsLoading(true);

    // Construct user message immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(), // Trim whitespace from input
      file: currentUpload || undefined,
    };

     // Construct thinking message based on whether a file is included
    const thinkingContent = currentUpload ? `Analyzing ${currentUpload.fileName}...` : "Thinking...";
    const thinkingMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "thinking", // Keep internal state as 'thinking'
      // We don't know if a tool will be used yet
    };

    // Add user message and thinking message to state
    setMessages((prev) => [...prev, userMessage, thinkingMessage]);

    // Clear input and reset upload state *after* adding to messages
    setInput("");
    setCurrentUpload(null); // File is now part of the userMessage

    // Prepare messages for API, excluding the 'thinking' message
    const messagesForApi = messages.concat(userMessage); // Use the just created user message

    const requestBody = {
      // Map messages for the API structure
      messages: messagesForApi.map(msg => ({
          role: msg.role,
          content: msg.content, // Send only content for regular messages
          // File data is handled separately below for the *last* user message
      })),
      // Add file data if the *last submitted* message had a file
      fileData: userMessage.file ? {
           base64: userMessage.file.base64,
           mediaType: userMessage.file.mediaType,
           isText: userMessage.file.isText,
           fileName: userMessage.file.fileName, // Send filename too
      } : null,
      model: selectedModel,
    };

    // console.log("Sending to API:", JSON.stringify(requestBody, null, 2));

    try {
      const response = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Try to parse error response from API
        let errorData;
        try {
            errorData = await response.json();
        } catch (parseError) {
            // If response is not JSON or empty
            errorData = { error: "API Error", details: `Request failed with status: ${response.status} ${response.statusText}` };
        }
        console.error("API Error Response:", errorData);
        throw new Error(errorData.details || errorData.error || `HTTP error ${response.status}`);
      }

      const data: APIResponse = await response.json();
      // console.log("Received from API:", data);

      // Update the 'thinking' message with the actual response
      setMessages((prev) => {
        const newMessages = [...prev];
        const thinkingIndex = newMessages.findIndex(m => m.content === 'thinking' && m.role === 'assistant');
        if (thinkingIndex !== -1) {
           newMessages[thinkingIndex] = {
             id: newMessages[thinkingIndex].id, // Keep the same ID for stability
             role: "assistant",
             content: data.content || (data.hasToolUse ? "Generated a chart based on your request." : "I received an empty response."), // Provide fallback content
             hasToolUse: data.hasToolUse || !!data.toolUse,
             chartData: data.chartData || (data.toolUse?.input), // Use chartData if present, fallback to toolUse.input
           };
        } else {
            // Should not happen, but handle gracefully if thinking message wasn't found
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
      // Update the 'thinking' message to show the error
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
      // Show error toast
       toast({
           title: "Request Failed",
           description: errorMessage,
           variant: "destructive"
       });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press in textarea (keep existing)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault(); // Prevent newline
      handleSubmit(); // Trigger submit
    }
  };

  // Handle textarea resizing (keep existing)
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = event.target;
    setInput(textarea.value);
    textarea.style.height = "auto"; // Reset height
    // Set height based on scroll height, capped at a max (e.g., 200px)
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const chartMessages = messages.filter(m => m.chartData);

  return (
    // Main container div - remove TopNavBar here
    // Use grid for layout instead of flex
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 h-[calc(100vh-3.5rem)] overflow-hidden"> {/* h-screen minus header height */}

        {/* Chat Sidebar (Column 1) */}
        <Card className="lg:col-span-1 flex flex-col h-full overflow-hidden"> {/* Takes 1 col on large screens */}
           <CardHeader className="py-3 px-4 border-b"> {/* Added border */}
             <div className="flex items-center justify-between">
                {/* Left side: Title and Model Selector */}
                <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8 border">
                        <AvatarImage src="/ant-logo.svg" alt="AI Assistant Avatar" />
                        <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-base font-semibold"> {/* Adjusted size */}
                           Financial Assistant
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Powered by Claude
                        </CardDescription>
                    </div>
                </div>

                {/* Right side: Model Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs px-2 gap-1"> {/* Adjusted size/padding */}
                        {models.find((m) => m.id === selectedModel)?.name || 'Select Model'}
                        <ChevronDown className="ml-1 h-4 w-4 opacity-70" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    {models.map((model) => (
                        <DropdownMenuItem
                           key={model.id}
                           onSelect={() => setSelectedModel(model.id)}
                           className="text-xs" // Smaller font in dropdown
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
             ref={messagesContainerRef} // Add ref here
             className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth" // Added space-y
           >
             {messages.length === 0 ? (
                // Welcome/Instructions Message
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
                // Render actual messages
               messages.map((message) => (
                 <div
                   key={message.id}
                   className={`animate-fade-in-up ${ // Apply animation
                     message.content === "thinking" ? "opacity-70" : "" // Dim thinking message slightly
                   }`}
                 >
                   <MessageComponent message={message} />
                 </div>
               ))
             )}
              {/* No need for messagesEndRef div if using scrollIntoView on container */}
           </CardContent>

            {/* Input Area */}
           <CardFooter className="p-3 border-t bg-background"> {/* Ensure background matches */}
             <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
               {/* File Preview Area */}
                {currentUpload && (
                  <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                    <FilePreview
                        file={currentUpload}
                        size="small" // Use small preview here
                     />
                      <span className="text-xs text-muted-foreground truncate mx-2 flex-1">{currentUpload.fileName}</span>
                      {/* Keep the remove button if FilePreview doesn't have it */}
                      {/* <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentUpload(null)}> <X className="h-4 w-4" /></Button> */}
                  </div>
                 )}
                {/* Text Input and Buttons */}
               <div className="flex items-end space-x-2">
                 {/* File Upload Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0" // Match textarea height, prevent shrinking
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isUploading}
                    aria-label="Attach file"
                  >
                   {isUploading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" /> : <Paperclip className="h-5 w-5" />}
                  </Button>
                  {/* Textarea */}
                  <Textarea
                    ref={input => input && (input.style.height = 'auto', input.style.height = `${Math.min(input.scrollHeight, 200)}px`)} // Inline ref for resize on mount/change
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your data or file..."
                    disabled={isLoading}
                    className="flex-1 resize-none min-h-[40px] max-h-[200px] text-sm py-2 px-3 leading-tight" // Adjusted styling
                    rows={1}
                    aria-label="Chat message input"
                  />
                  {/* Send Button */}
                  <Button
                    type="submit"
                    size="icon"
                    className="h-9 w-9 shrink-0" // Match textarea height, prevent shrinking
                    disabled={isLoading || isUploading || (!input.trim() && !currentUpload)}
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
               </div>
             </form>
             {/* Hidden file input element */}
             <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                accept=".csv,.txt,.md,.json,application/pdf,image/*" // Specify acceptable types
              />
           </CardFooter>
        </Card>

       {/* Content Area (Charts/Analysis) (Column 2 & 3) */}
        <Card className="lg:col-span-2 flex flex-col h-full overflow-hidden relative"> {/* Takes 2 cols on large, relative for pagination */}
           {chartMessages.length > 0 ? (
             // Show Charts
             <>
               <CardHeader className="py-3 px-4 border-b shrink-0">
                 <CardTitle className="text-base font-semibold">Analysis & Visualizations</CardTitle>
                 <CardDescription className="text-xs">Scroll through generated charts.</CardDescription>
               </CardHeader>
               <CardContent
                 ref={chartContainerRef}
                 className="flex-1 overflow-y-auto scroll-smooth snap-y snap-mandatory p-0" // Remove padding, add scroll behavior
                 onScroll={handleChartScroll} // Attach debounced scroll handler
               >
                 {/* Map through messages *with* chartData */}
                 {chartMessages.map((message, index) => (
                     <div
                       key={`chart-${message.id}`} // Use message ID for key
                       className="w-full h-full flex-shrink-0 snap-start snap-always flex items-center justify-center p-4" // Ensure full height and center content
                     >
                       <SafeChartRenderer data={message.chartData!} /> {/* Assert non-null chartData */}
                     </div>
                   ),
                 )}
               </CardContent>
               {/* Pagination Dots (only if more than one chart) */}
               {chartMessages.length > 1 && (
                 <ChartPagination
                   total={chartMessages.length}
                   current={currentChartIndex}
                   onDotClick={scrollToChart}
                 />
               )}
             </>
           ) : (
              // Show Placeholder
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