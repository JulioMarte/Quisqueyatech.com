"use client";

import { useEffect, useRef } from "react";
import { BlockTypeSelect, BoldItalicUnderlineToggles, CreateLink, InsertImage, InsertTable, ListsToggle, MDXEditor, type MDXEditorMethods, Separator, UndoRedo, headingsPlugin, imagePlugin, linkDialogPlugin, linkPlugin, listsPlugin, markdownShortcutPlugin, quotePlugin, tablePlugin, thematicBreakPlugin, toolbarPlugin } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";

export default function VisualMarkdownEditor({ value, onChange }: { value: string; onChange(value: string): void }) {
  const ref = useRef<MDXEditorMethods>(null);
  useEffect(() => { if (ref.current?.getMarkdown() !== value) ref.current?.setMarkdown(value); }, [value]);
  return <div className="min-h-[440px] rounded-xl border border-line bg-white"><MDXEditor ref={ref} markdown={value} onChange={onChange} contentEditableClassName="prose min-h-[380px] max-w-none px-5 py-4 outline-none" plugins={[headingsPlugin(), listsPlugin(), quotePlugin(), thematicBreakPlugin(), linkPlugin(), linkDialogPlugin(), tablePlugin(), imagePlugin(), markdownShortcutPlugin(), toolbarPlugin({ toolbarContents: () => <><UndoRedo /><Separator /><BlockTypeSelect /><BoldItalicUnderlineToggles /><ListsToggle /><CreateLink /><InsertImage /><InsertTable /></> })]} /></div>;
}
