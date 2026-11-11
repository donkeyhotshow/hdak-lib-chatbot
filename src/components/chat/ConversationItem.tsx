import { memo, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "./types";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  isNew: boolean;
  onLoad: (id: string) => void;
  onDelete: (id: string, event: MouseEvent) => void;
  onRename: (id: string, title: string) => void;
}

export const ConversationItem = memo(function ConversationItem({
  conversation,
  isActive,
  isNew,
  onLoad,
  onDelete,
  onRename,
}: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    },
    []
  );

  const startEditing = (event: MouseEvent) => {
    event.stopPropagation();
    setEditValue(conversation.title);
    setIsEditing(true);
  };

  const submitEdit = (event: MouseEvent | KeyboardEvent) => {
    event.stopPropagation();
    const title = editValue.trim();
    if (title && title !== conversation.title) {
      onRename(conversation.id, title);
    }
    setIsEditing(false);
  };

  const handleDelete = (event: MouseEvent) => {
    event.stopPropagation();
    if (confirmDelete) {
      onDelete(conversation.id, event);
      return;
    }
    setConfirmDelete(true);
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    deleteTimerRef.current = setTimeout(() => setConfirmDelete(false), 3000);
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isEditing && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onLoad(conversation.id);
    }
  };

  return (
    <div
      onClick={() => !isEditing && onLoad(conversation.id)}
      onKeyDown={handleRowKeyDown}
      role="button"
      tabIndex={0}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer transition-all",
        isActive
          ? "bg-[#D4A853]/10 border border-[#D4A853]/15"
          : "hover:bg-white/[0.04] border border-transparent"
      )}
    >
      {isNew && !isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853]/70 shrink-0" />
      )}
      {isEditing ? (
        <input
          autoFocus
          value={editValue}
          onChange={event => setEditValue(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter") submitEdit(event);
            if (event.key === "Escape") setIsEditing(false);
          }}
          onClick={event => event.stopPropagation()}
          aria-label="Назва розмови"
          className="flex-1 min-w-0 bg-white/[0.06] text-white/90 text-[12px] px-1.5 py-0.5 rounded outline-none border border-[#D4A853]/30"
        />
      ) : (
        <span className="text-[12.5px] leading-[1.45] text-white/65 group-hover:text-white/90 truncate flex-1 min-w-0 transition-colors">
          {conversation.title}
        </span>
      )}
      <div className="flex items-center gap-0.5 shrink-0">
        {isEditing ? (
          <button
            onClick={submitEdit}
            className="p-2 text-[#D4A853]/60 hover:text-[#D4A853] transition-colors rounded min-w-[28px] min-h-[28px] flex items-center justify-center"
            aria-label="Зберегти"
          >
            <Check size={11} strokeWidth={2} />
          </button>
        ) : (
          <button
            onClick={startEditing}
            className="p-2 text-white/0 group-hover:text-white/20 hover:!text-[#D4A853]/60 transition-all rounded min-w-[28px] min-h-[28px] flex items-center justify-center"
            aria-label="Перейменувати"
          >
            <Pencil size={10} strokeWidth={1.5} />
          </button>
        )}
        <button
          onClick={handleDelete}
          className={cn(
            "p-2 transition-all rounded text-[10px] min-w-[28px] min-h-[28px] flex items-center justify-center",
            confirmDelete
              ? "text-red-400/80 bg-red-400/10 font-medium px-2.5"
              : "text-white/0 group-hover:text-white/25 hover:!text-red-400/60"
          )}
          aria-label={confirmDelete ? "Підтвердити видалення" : "Видалити"}
          title={
            confirmDelete ? "Натисніть ще раз для підтвердження" : "Видалити"
          }
        >
          {confirmDelete ? "×?" : <Trash2 size={11} strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  );
});
