import { useRef, useMemo, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor = ({ value, onChange, placeholder, className }: RichTextEditorProps) => {
  const quillRef = useRef<ReactQuill>(null);

  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const quill = quillRef.current?.getEditor();
          if (quill && reader.result) {
            const range = quill.getSelection();
            quill.insertEmbed(range?.index || 0, 'image', reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    };
  }, []);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    },
    clipboard: {
      matchVisual: false,
    }
  }), [imageHandler]);

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'blockquote', 'code-block', 'link', 'image'
  ];

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    const items = clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const quill = quillRef.current?.getEditor();
            if (quill && reader.result) {
              const range = quill.getSelection();
              quill.insertEmbed(range?.index || 0, 'image', reader.result);
            }
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }, []);

  return (
    <div className={className} onPaste={handlePaste}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        style={{
          backgroundColor: 'hsl(var(--background))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius)',
        }}
      />
      <style>{`
        .ql-container {
          border-bottom-left-radius: var(--radius);
          border-bottom-right-radius: var(--radius);
          background: hsl(var(--background));
        }
        
        .ql-toolbar {
          border-top-left-radius: var(--radius);
          border-top-right-radius: var(--radius);
          background: hsl(var(--muted));
          border-color: hsl(var(--border));
        }
        
        .ql-editor {
          color: hsl(var(--foreground));
          min-height: 120px;
        }
        
        .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
        }
      `}</style>
    </div>
  );
};