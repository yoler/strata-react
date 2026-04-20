import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { NotionEditor } from "@/widgets/editor";
import type { UploadImageOptions } from "@/widgets/editor/types";

const mockUploadImage = async (file: File, options?: UploadImageOptions) => {
  console.log("Mock uploading file: ", file.name);

  return new Promise<string>((resolve, reject) => {
    let progress = 0;

    const intervalId = window.setInterval(() => {
      if (options?.signal?.aborted) {
        window.clearInterval(intervalId);
        reject(new DOMException("Upload cancelled", "AbortError"));
        return;
      }

      progress = Math.min(progress + 10, 100);
      options?.onProgress?.(progress);

      if (progress >= 100) {
        window.clearInterval(intervalId);
        resolve(URL.createObjectURL(file));
      }
    }, 180);
  });
};

export function EditorPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary">Components</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Notion Editor</h1>
        <p className="text-muted-foreground max-w-3xl leading-7">
          A truly Notion-like Tiptap 3.0 advanced editor setup.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Notion-like Editor Demo</CardTitle>
          <CardDescription>Built with Tiptap 3.0 & shadcn/ui. Try pressing '/' or drag handles.</CardDescription>
        </CardHeader>
        <CardContent>
          <NotionEditor
            initialContent={`<p>Try typing <strong>/</strong> to see the slash command menu.</p><p>Or select this text to see the floating bubble menu.</p><p>Hover on the left edge of this text to drag it around!</p>`}
            uploadImage={mockUploadImage}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default EditorPage;
