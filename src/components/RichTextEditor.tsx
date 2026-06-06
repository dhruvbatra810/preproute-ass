import { useEffect, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import TextAlign from "@tiptap/extension-text-align"
import Image from "@tiptap/extension-image"
import {
    Bold, Italic, Underline as UnderlineIcon,
    List, ListOrdered, AlignLeft, AlignCenter, AlignRight, ImageIcon,
} from "lucide-react"
import styles from "./RichTextEditor.module.css"

type Props = {
    value: string
    onChange: (html: string) => void
    placeholder?: string
}

const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2 MB

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
    const imageInputRef = useRef<HTMLInputElement>(null)

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({ openOnClick: false }),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            Image.configure({ inline: false, allowBase64: true }),
        ],
        content: value || "",
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
        editorProps: {
            attributes: { class: styles.editorContent },
        },
    })

    useEffect(() => {
        if (!editor) return
        const current = editor.getHTML()
        if (value !== current) editor.commands.setContent(value || "", { emitUpdate: false })
    }, [value])

    const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file || !editor) return
        if (file.size > MAX_IMAGE_BYTES) {
            alert("Image must be smaller than 2 MB.")
            return
        }
        const reader = new FileReader()
        reader.onload = (ev) => {
            const src = ev.target?.result as string
            editor.chain().focus().setImage({ src }).run()
        }
        reader.readAsDataURL(file)
    }

    if (!editor) return null

    const ToolbarBtn = ({
        active, onClick, children,
    }: { active?: boolean; onClick: () => void; children: React.ReactNode }) => (
        <button
            type="button"
            className={`${styles.toolbarBtn} ${active ? styles.active : ""}`}
            onMouseDown={(e) => { e.preventDefault(); onClick() }}
        >
            {children}
        </button>
    )

    return (
        <div className={styles.wrapper}>
            <div className={styles.toolbar}>
                <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
                    <Bold size={14} />
                </ToolbarBtn>
                <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
                    <Italic size={14} />
                </ToolbarBtn>
                <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                    <UnderlineIcon size={14} />
                </ToolbarBtn>
                <div className={styles.divider} />
                <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                    <List size={14} />
                </ToolbarBtn>
                <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                    <ListOrdered size={14} />
                </ToolbarBtn>
                <div className={styles.divider} />
                <ToolbarBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
                    <AlignLeft size={14} />
                </ToolbarBtn>
                <ToolbarBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
                    <AlignCenter size={14} />
                </ToolbarBtn>
                <ToolbarBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
                    <AlignRight size={14} />
                </ToolbarBtn>
                <div className={styles.divider} />
                <ToolbarBtn active={false} onClick={() => imageInputRef.current?.click()}>
                    <ImageIcon size={14} />
                </ToolbarBtn>
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleImageFile}
                />
            </div>
            <EditorContent editor={editor} placeholder={placeholder} />
        </div>
    )
}
