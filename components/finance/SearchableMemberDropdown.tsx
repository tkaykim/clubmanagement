"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchableMemberOption = {
  id: string;
  name: string;
};

type SearchableMemberDropdownProps = {
  ariaLabel: string;
  dataTestId?: string;
  disabled?: boolean;
  emptyLabel?: string;
  onSelect: (id: string) => void;
  options: SearchableMemberOption[];
  placeholder: string;
  value?: string;
};

export function SearchableMemberDropdown({
  ariaLabel,
  dataTestId,
  disabled = false,
  emptyLabel = "일치하는 참여자가 없습니다.",
  onSelect,
  options,
  placeholder,
  value = "",
}: SearchableMemberDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.id === value);
  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
    return normalizedQuery ? options.filter((option) => option.name.toLocaleLowerCase("ko-KR").includes(normalizedQuery)) : options;
  }, [options, query]);
  const visibleActiveIndex = Math.min(activeIndex, Math.max(visibleOptions.length - 1, 0));

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    inputRef.current?.focus();
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || !visibleOptions[visibleActiveIndex]) return;
    document.getElementById(`${listboxId}-${visibleOptions[visibleActiveIndex].id}`)?.scrollIntoView({ block: "nearest" });
  }, [listboxId, open, visibleActiveIndex, visibleOptions]);

  function showMenu() {
    if (disabled) return;
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
  }

  function choose(option: SearchableMemberOption) {
    if (disabled) return;
    onSelect(option.id);
    setOpen(false);
    setQuery("");
    queueMicrotask(() => triggerRef.current?.focus());
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement | HTMLButtonElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      if (event.currentTarget === inputRef.current) queueMicrotask(() => triggerRef.current?.focus());
      return;
    }
    if (disabled) return;
    if (!open && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      showMenu();
      return;
    }
    if (!open || visibleOptions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % visibleOptions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + visibleOptions.length) % visibleOptions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(visibleOptions[visibleActiveIndex]);
    }
  }

  return <div className="finance-member-combobox" ref={rootRef} data-testid={dataTestId}>
    <button
      aria-controls={listboxId}
      aria-expanded={open && !disabled}
      aria-haspopup="listbox"
      aria-label={ariaLabel}
      className="select finance-member-combobox-trigger"
      disabled={disabled}
      onClick={() => open ? setOpen(false) : showMenu()}
      onKeyDown={handleKeyDown}
      ref={triggerRef}
      type="button"
    >
      <span>{selected?.name ?? placeholder}</span>
      <ChevronDown aria-hidden="true" size={15} />
    </button>
    {open && !disabled && <div className="finance-member-combobox-popover">
      <div className="finance-member-combobox-search">
        <Search aria-hidden="true" size={14} />
        <input
          aria-activedescendant={visibleOptions[visibleActiveIndex] ? `${listboxId}-${visibleOptions[visibleActiveIndex].id}` : undefined}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-label={`${ariaLabel} 검색`}
          autoComplete="off"
          className="input"
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
          onKeyDown={handleKeyDown}
          placeholder="이름 검색"
          ref={inputRef}
          role="combobox"
          value={query}
        />
        {query && <button aria-label="검색어 지우기" className="finance-member-combobox-clear" onClick={() => { setQuery(""); setActiveIndex(0); }} type="button"><X size={13} /></button>}
      </div>
      <ul aria-label={ariaLabel} className="finance-member-combobox-list" id={listboxId} role="listbox">
        {visibleOptions.length ? visibleOptions.map((option, index) => <li
          aria-selected={option.id === value}
          className={index === visibleActiveIndex ? "active" : undefined}
          id={`${listboxId}-${option.id}`}
          key={option.id}
          onClick={() => choose(option)}
          onMouseDown={(event) => event.preventDefault()}
          onMouseMove={() => setActiveIndex(index)}
          role="option"
          tabIndex={-1}
        >{option.name}</li>) : <li className="finance-member-combobox-empty" role="status">{emptyLabel}</li>}
      </ul>
    </div>}
  </div>;
}
