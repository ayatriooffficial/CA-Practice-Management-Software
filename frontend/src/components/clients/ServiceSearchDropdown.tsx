"use client";

import React, {
    useState,
    useRef,
    useEffect,
    useMemo,
    useCallback,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X, Check, RefreshCw, Loader2 } from "lucide-react";
import { Service } from "@/data/serviceData";

interface ServiceSearchDropdownProps {
    id?: string;
    name?: string;
    /** Currently selected service name */
    value: string;
    /** Full list of services from the Redux store */
    services?: Service[];
    /** Whether the store is still loading services */
    loadingServices?: boolean;
    /** Whether load-more services is currently in progress */
    loadingMoreServices?: boolean;
    /** Whether services have been loaded from API at least once */
    isLoaded?: boolean;
    /** Whether more services exist on the backend to load */
    hasMoreServices?: boolean;
    /** Callback to fetch initial batch of services (limit 10) */
    onFetchServices?: () => void;
    /** Callback to fetch next page of services (limit 10) */
    onLoadMoreServices?: () => void;
    /** If set, only services of this category are listed */
    filterCategory?: string;
    onSelect: (service: Service) => void;
    onClear?: () => void;
    placeholder?: string;
    disabled?: boolean;
    "aria-label"?: string;
}

export const ServiceSearchDropdown: React.FC<ServiceSearchDropdownProps> = ({
    id,
    name,
    value,
    services = [],
    loadingServices = false,
    loadingMoreServices = false,
    isLoaded = false,
    hasMoreServices = false,
    onFetchServices,
    onLoadMoreServices,
    filterCategory,
    onSelect,
    onClear,
    placeholder = "Select Service",
    disabled = false,
    "aria-label": ariaLabel,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(-1);
    const [mounted, setMounted] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const [coords, setCoords] = useState<{
        top?: number;
        bottom?: number;
        left: number;
        width: number;
        placement: "top" | "bottom";
    }>({ left: 0, width: 280, placement: "bottom" });

    useEffect(() => {
        setMounted(true);
    }, []);

    // Category-filtered base list (active services only)
    const baseList = useMemo(() => {
        const list = services || [];
        const active = list.filter((s) => s.status !== "Inactive" && !s.isDeleted);
        if (!filterCategory) return active;
        return active.filter((s) => s.category?.toLowerCase() === filterCategory.toLowerCase());
    }, [services, filterCategory]);

    // Full filtered list (by search query)
    const filteredList = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return baseList;
        return baseList.filter(
            (s) =>
                s.name.toLowerCase().includes(query) ||
                (s.category ?? "").toLowerCase().includes(query) ||
                (s.sacCode ?? "").toLowerCase().includes(query) ||
                (s.frequency ?? "").toLowerCase().includes(query)
        );
    }, [baseList, searchQuery]);

    const isSearching = searchQuery.trim().length > 0;

    // ── Positioning ──────────────────────────────────────────────────────────
    const updateCoords = useCallback(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const dropdownHeight = 340;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const placement: "top" | "bottom" =
            spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove
                ? "bottom"
                : "top";

        const width = Math.max(rect.width, 280);
        let left = rect.left;
        if (left + width > window.innerWidth - 12) {
            left = Math.max(12, window.innerWidth - width - 12);
        }

        if (placement === "top") {
            setCoords({
                bottom: window.innerHeight - rect.top + 4,
                left,
                width,
                placement,
            });
        } else {
            setCoords({ top: rect.bottom + 4, left, width, placement });
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        updateCoords();
        const handle = () => updateCoords();
        window.addEventListener("scroll", handle, true);
        window.addEventListener("resize", handle);
        return () => {
            window.removeEventListener("scroll", handle, true);
            window.removeEventListener("resize", handle);
        };
    }, [isOpen, updateCoords]);

    // ── Click-outside close ──────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                containerRef.current &&
                !containerRef.current.contains(target) &&
                popoverRef.current &&
                !popoverRef.current.contains(target)
            ) {
                setIsOpen(false);
                setSearchQuery("");
                setActiveIndex(-1);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    // ── Auto-focus search on open ────────────────────────────────────────────
    useEffect(() => {
        if (isOpen) {
            const t = setTimeout(() => searchInputRef.current?.focus(), 50);
            return () => clearTimeout(t);
        }
    }, [isOpen]);

    // ── Keyboard active item scroll-into-view ───────────────────────────────
    useEffect(() => {
        if (activeIndex >= 0 && listRef.current) {
            const item = listRef.current.children[activeIndex] as
                | HTMLElement
                | undefined;
            item?.scrollIntoView({ block: "nearest" });
        }
    }, [activeIndex]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleSelectOption = (service: Service) => {
        onSelect(service);
        setIsOpen(false);
        setSearchQuery("");
        setActiveIndex(-1);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onClear) onClear();
        setIsOpen(false);
        setSearchQuery("");
    };

    const handleToggleOpen = () => {
        if (disabled) return;
        updateCoords();
        const willOpen = !isOpen;
        setIsOpen(willOpen);
        if (willOpen) {
            setSearchQuery("");
            setActiveIndex(-1);
            if (onFetchServices) {
                onFetchServices();
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;
        if (!isOpen) {
            if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
                e.preventDefault();
                handleToggleOpen();
            }
            return;
        }
        if (e.key === "Escape") {
            e.preventDefault();
            setIsOpen(false);
            setSearchQuery("");
            setActiveIndex(-1);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((p) => (p < filteredList.length - 1 ? p + 1 : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((p) => (p > 0 ? p - 1 : filteredList.length - 1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < filteredList.length) {
                handleSelectOption(filteredList[activeIndex]);
            }
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            className="relative w-full text-xs"
            onKeyDown={handleKeyDown}
        >
            {/* ── Trigger button ── */}
            <div
                id={id}
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={ariaLabel || "Select Service"}
                tabIndex={disabled ? -1 : 0}
                onClick={handleToggleOpen}
                className={`flex h-9 w-full items-center justify-between rounded border bg-white dark:bg-[#0f172a] px-2 text-xs outline-none transition-colors cursor-pointer select-none ${disabled
                        ? "bg-gray-100 dark:bg-gray-800 opacity-60 cursor-not-allowed"
                        : isOpen
                            ? "border-[#31719B] ring-1 ring-[#31719B]"
                            : "border-[#dde2e8] dark:border-[#475569] hover:border-gray-400 focus:border-[#31719B]"
                    }`}
            >
                <span
                    className={`truncate font-medium ${value
                            ? "text-gray-900 dark:text-gray-100"
                            : "text-gray-400 dark:text-gray-500 font-normal"
                        }`}
                >
                    {value || placeholder}
                </span>
                <div className="flex items-center gap-1 shrink-0 ml-1">
                    {(loadingServices || loadingMoreServices) && (
                        <Loader2 className="w-3 h-3 animate-spin text-[#31719B]" />
                    )}
                    {value && !disabled && !loadingServices && !loadingMoreServices && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            title="Clear selection"
                            aria-label="Clear selection"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                    <ChevronDown
                        className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${isOpen ? "rotate-180 text-[#31719B]" : ""
                            }`}
                    />
                </div>
            </div>

            {/* ── Floating Popover via Portal ── */}
            {isOpen &&
                mounted &&
                createPortal(
                    <div
                        ref={popoverRef}
                        style={{
                            position: "fixed",
                            top: coords.top !== undefined ? `${coords.top}px` : undefined,
                            bottom:
                                coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
                            left: `${coords.left}px`,
                            width: `${coords.width}px`,
                            zIndex: 99999,
                        }}
                        className={`rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-2xl overflow-hidden flex flex-col ${coords.placement === "top"
                                ? "animate-in fade-in slide-in-from-bottom-2 duration-150"
                                : "animate-in fade-in slide-in-from-top-2 duration-150"
                            }`}
                    >
                        {/* ── Search Header ── */}
                        <div className="p-2 border-b border-[#dde2e8] dark:border-[#334155] bg-gray-50 dark:bg-[#0f172a]">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    aria-label="Search services"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setActiveIndex(0);
                                    }}
                                    placeholder="Search service, category..."
                                    className="w-full pl-8 pr-7 py-1.5 rounded text-xs outline-none border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-gray-900 dark:text-gray-100 focus:border-[#31719B]"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery("");
                                            searchInputRef.current?.focus();
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── Services List ── */}
                        <ul
                            ref={listRef}
                            role="listbox"
                            className="max-h-56 overflow-y-auto py-1 divide-y divide-gray-50 dark:divide-gray-800/60"
                        >
                            {/* Loading initial batch */}
                            {loadingServices && services.length === 0 ? (
                                <li className="p-4 flex flex-col items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <Loader2 className="w-5 h-5 animate-spin text-[#31719B]" />
                                    <span className="font-medium">Loading services...</span>
                                </li>
                            ) : !isLoaded && services.length === 0 ? (
                                <li className="p-4 flex flex-col items-center justify-center gap-2.5 text-xs text-gray-500 dark:text-gray-400">
                                    <span>Services not loaded yet.</span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onFetchServices?.();
                                        }}
                                        className="px-3 py-1.5 rounded bg-[#31719B] text-white font-medium hover:bg-[#27597b] transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        <span>Load services</span>
                                    </button>
                                </li>
                            ) : filteredList.length === 0 ? (
                                <li className="p-3 text-center text-xs text-gray-400">
                                    {baseList.length === 0
                                        ? filterCategory
                                            ? `No services in category "${filterCategory}".`
                                            : "No services found."
                                        : "No matching services. Try a different search."}
                                </li>
                            ) : (
                                filteredList.map((svc, idx) => {
                                    const isSelected = svc.name === value;
                                    const isHovered = idx === activeIndex;
                                    return (
                                        <li
                                            key={svc.id}
                                            role="option"
                                            aria-selected={isSelected}
                                            onClick={() => handleSelectOption(svc)}
                                            onMouseEnter={() => setActiveIndex(idx)}
                                            className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${isSelected
                                                    ? "bg-[#31719B]/10 text-[#31719B] font-semibold"
                                                    : isHovered
                                                        ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                                        : "text-gray-700 dark:text-gray-300"
                                                }`}
                                        >
                                            <div className="flex flex-col min-w-0 pr-2">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    {svc.isRecurring && (
                                                        <span title="Recurring service">
                                                            <RefreshCw className="w-3 h-3 text-[#31719B] shrink-0" />
                                                        </span>
                                                    )}
                                                    <span className="truncate font-medium">
                                                        {svc.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                                                    <span>{svc.category}</span>
                                                    {svc.frequency && (
                                                        <span>• {svc.frequency}</span>
                                                    )}
                                                    {(() => {
                                                        const fee = Number(svc.totalServiceFee) > 0
                                                            ? Number(svc.totalServiceFee)
                                                            : (Number(svc.professionalFee) || 0) + (Number(svc.governmentFee) || 0);
                                                        return fee > 0 ? (
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                                                • Total: ₹{fee.toLocaleString('en-IN')}
                                                            </span>
                                                        ) : null;
                                                    })()}
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <Check className="w-4 h-4 text-[#31719B] shrink-0 ml-2" />
                                            )}
                                        </li>
                                    );
                                })
                            )}
                        </ul>

                        {/* ── Load More Service Button ── */}
                        {hasMoreServices && (
                            <div className="p-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/90 dark:bg-[#0f172a]/90">
                                <button
                                    type="button"
                                    disabled={loadingMoreServices}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLoadMoreServices?.();
                                    }}
                                    className="w-full py-2 px-3 rounded text-xs font-semibold bg-[#31719B] hover:bg-[#27597b] text-white shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {loadingMoreServices ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Loading more services...</span>
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="w-3.5 h-3.5" />
                                            <span>Load more service</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* ── Footer summary ── */}
                        {!isSearching && !hasMoreServices && services.length > 0 && (
                            <div className="px-3 py-1.5 text-[10.5px] text-gray-400 dark:text-gray-500 bg-gray-50/80 dark:bg-[#0f172a] border-t border-gray-100 dark:border-gray-800 text-center">
                                All services loaded ({filteredList.length} service{filteredList.length !== 1 ? "s" : ""}
                                {filterCategory ? ` in "${filterCategory}"` : ""})
                            </div>
                        )}
                        {!isSearching && hasMoreServices && services.length > 0 && (
                            <div className="px-3 py-1 text-[10px] text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-[#0f172a]/50 text-center">
                                Showing {filteredList.length} loaded service{filteredList.length !== 1 ? "s" : ""}
                            </div>
                        )}
                    </div>,
                    document.body
                )}
        </div>
    );
};

export default ServiceSearchDropdown;
