"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { stripAccents } from "@/lib/utils";
import { useUniverseData } from "@/contexts/UniverseDataContext";
import { useSpoilerProgress } from "@/contexts/SpoilerProgressContext";
import type { OrderGroup } from "@/lib/progress-order";
import {
  clearGameStorageForUniverse,
  filterPlayableCharacters,
  persistedFromSelection,
  saveSpoilerProgress,
  type ProgressFieldConfig,
  type SpoilerProgressSelection,
} from "@/lib/spoiler-progress";
import { Button } from "@/components/ui/Button";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

interface SetupProgressFormProps {
  universeId: string;
}

type GroupCheckState = "none" | "partial" | "all";

function selectionFromUi(allSeen: boolean, seenSet: Set<string>): SpoilerProgressSelection | null {
  if (allSeen) return { mode: "all" };
  if (seenSet.size === 0) return null;
  return { mode: "seen", labels: [...seenSet] };
}

function groupCheckState(group: OrderGroup, seenSet: Set<string>): GroupCheckState {
  let selected = 0;
  for (const item of group.leaves) {
    if (seenSet.has(item)) selected++;
  }
  if (selected === 0) return "none";
  if (selected === group.leaves.length) return "all";
  return "partial";
}

function IndeterminateCheckbox({
  state,
  onToggle,
  className = "",
}: {
  state: GroupCheckState;
  onToggle: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "partial";
  }, [state]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === "all"}
      onChange={onToggle}
      className={className}
    />
  );
}

function OrderGroupNode({
  group,
  groupKey,
  seenSet,
  expandedKeys,
  onToggleExpand,
  onToggleItem,
  onToggleGroup,
  depth = 0,
}: {
  group: OrderGroup;
  groupKey: string;
  seenSet: Set<string>;
  expandedKeys: Set<string>;
  onToggleExpand: (key: string) => void;
  onToggleItem: (label: string) => void;
  onToggleGroup: (group: OrderGroup) => void;
  depth?: number;
}) {
  const state = groupCheckState(group, seenSet);
  const hasChildren = Boolean(group.children?.length);
  const hasItems = group.items.length > 0;
  const collapsible = hasChildren || hasItems;
  const expanded = expandedKeys.has(groupKey);

  return (
    <li
      className={
        depth === 0
          ? "rounded-md border border-gray-700/80 bg-gray-900/40"
          : "rounded-md border border-gray-700/50 bg-gray-900/25"
      }
    >
      <div
        className={`flex items-center gap-2 hover:bg-gray-700/30 ${
          depth === 0 ? "px-3 py-2.5" : "px-2 py-2"
        }`}
      >
        {collapsible ? (
          <button
            type="button"
            onClick={() => onToggleExpand(groupKey)}
            aria-expanded={expanded}
            aria-label={stripAccents(expanded ? "Replier" : "Déplier")}
            className="flex size-6 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-700/50 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
          >
            <span className="text-xs" aria-hidden>
              {expanded ? (
                <FaChevronUp className="size-3" />
              ) : (
                <FaChevronDown className="size-3" />
              )}
            </span>
          </button>
        ) : (
          <span className="size-6 shrink-0" aria-hidden />
        )}
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
          <IndeterminateCheckbox
            state={state}
            onToggle={() => onToggleGroup(group)}
            className="size-4 shrink-0 rounded border-gray-500 bg-gray-900 text-ocean-500 focus:ring-ocean-500"
          />
          <span className={depth === 0 ? "text-sm font-medium text-white" : "text-sm text-gray-200"}>
            {stripAccents(group.label)}
          </span>
        </label>
      </div>
      {expanded && hasChildren ? (
        <ul className={`space-y-2 border-t border-gray-700/60 pb-2 pt-1 ${depth === 0 ? "pl-3 pr-2" : "pl-3 pr-1"}`}>
          {group.children!.map((child) => (
            <OrderGroupNode
              key={child.label}
              groupKey={`${groupKey}::${child.label}`}
              group={child}
              seenSet={seenSet}
              expandedKeys={expandedKeys}
              onToggleExpand={onToggleExpand}
              onToggleItem={onToggleItem}
              onToggleGroup={onToggleGroup}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
      {expanded && !hasChildren && hasItems ? (
        <ul className="space-y-0.5 border-t border-gray-700/60 pb-2 pl-4 pr-2 pt-1">
          {group.items.map((label) => (
            <li key={label}>
              <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 hover:bg-gray-700/40">
                <input
                  type="checkbox"
                  checked={seenSet.has(label)}
                  onChange={() => onToggleItem(label)}
                  className="mt-0.5 size-4 shrink-0 rounded border-gray-500 bg-gray-900 text-ocean-500 focus:ring-ocean-500"
                />
                <span className="text-sm text-gray-300">{stripAccents(label)}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function GroupedOrderList({
  groups,
  seenSet,
  onToggleItem,
  onToggleGroup,
}: {
  groups: OrderGroup[];
  seenSet: Set<string>;
  onToggleItem: (label: string) => void;
  onToggleGroup: (group: OrderGroup) => void;
}) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());

  const onToggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <ul className="space-y-3">
      {groups.map((group) => (
        <OrderGroupNode
          key={group.label}
          groupKey={group.label}
          group={group}
          seenSet={seenSet}
          expandedKeys={expandedKeys}
          onToggleExpand={onToggleExpand}
          onToggleItem={onToggleItem}
          onToggleGroup={onToggleGroup}
        />
      ))}
    </ul>
  );
}

function FlatOrderList({
  labels,
  seenSet,
  onToggleItem,
}: {
  labels: string[];
  seenSet: Set<string>;
  onToggleItem: (label: string) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {labels.map((label) => (
        <li key={label}>
          <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-gray-700/50">
            <input
              type="checkbox"
              checked={seenSet.has(label)}
              onChange={() => onToggleItem(label)}
              className="mt-0.5 size-4 shrink-0 rounded border-gray-500 bg-gray-900 text-ocean-500 focus:ring-ocean-500"
            />
            <span className="text-sm text-gray-200">{stripAccents(label)}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

function allLabelsForField(config: ProgressFieldConfig): string[] {
  return config.order;
}

export function SetupProgressForm({ universeId }: SetupProgressFormProps) {
  const router = useRouter();
  const { characters } = useUniverseData();
  const { progressField, selection, setSelection } = useSpoilerProgress();
  const [allSeen, setAllSeen] = useState(false);
  const [seenSet, setSeenSet] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!selection) return;
    if (selection.mode === "all") {
      setAllSeen(true);
      setSeenSet(new Set());
      return;
    }
    setAllSeen(false);
    setSeenSet(new Set(selection.labels));
  }, [selection]);

  const currentSelection = useMemo(
    () => selectionFromUi(allSeen, seenSet),
    [allSeen, seenSet],
  );

  const playableCount = useMemo(() => {
    if (!progressField || !currentSelection) return 0;
    return filterPlayableCharacters(characters, progressField, currentSelection).length;
  }, [characters, progressField, currentSelection]);

  if (!progressField) return null;

  const toggleLabel = (label: string) => {
    setAllSeen(false);
    setSeenSet((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const toggleGroup = (group: OrderGroup) => {
    setAllSeen(false);
    setSeenSet((prev) => {
      const next = new Set(prev);
      const state = groupCheckState(group, prev);
      if (state === "all") {
        for (const item of group.leaves) next.delete(item);
      } else {
        for (const item of group.leaves) next.add(item);
      }
      return next;
    });
  };

  const selectAll = () => {
    setAllSeen(false);
    setSeenSet(new Set(allLabelsForField(progressField)));
  };

  const clearAll = () => {
    setAllSeen(false);
    setSeenSet(new Set());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelection) return;
    saveSpoilerProgress(persistedFromSelection(universeId, currentSelection));
    clearGameStorageForUniverse(universeId);
    setSelection(currentSelection);
    router.push(`/game/${universeId}`);
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-5">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-white">
          {stripAccents("Qu'as-tu déjà vu ?")}
        </h2>
        <p className="text-sm text-gray-400">
          {stripAccents(
            progressField.groups?.length
              ? "Coche ce que tu as vu. Seuls les personnages correspondants pourront être à deviner."
              : `Coche les ${progressField.label.toLowerCase()} que tu as vus. Seuls les personnages correspondants pourront être à deviner.`,
          )}
        </p>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-600 bg-gray-800/80 px-4 py-3">
        <input
          type="checkbox"
          checked={allSeen}
          onChange={(e) => {
            setAllSeen(e.target.checked);
            if (e.target.checked) setSeenSet(new Set());
          }}
          className="size-4 shrink-0 rounded border-gray-500 bg-gray-900 text-ocean-500 focus:ring-ocean-500"
        />
        <span className="text-sm font-medium text-white">
          {stripAccents("J'ai tout vu (sans limite)")}
        </span>
      </label>

      {!allSeen ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-300">{progressField.label}</span>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="text-ocean-400 hover:text-ocean-300 focus:outline-none focus-visible:underline"
              >
                {stripAccents("Tout cocher")}
              </button>
              <span className="text-gray-600" aria-hidden>
                ·
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="text-gray-400 hover:text-gray-300 focus:outline-none focus-visible:underline"
              >
                {stripAccents("Tout décocher")}
              </button>
            </div>
          </div>
          <div className="max-h-[min(28rem,55vh)] overflow-y-auto rounded-lg border border-gray-600 bg-gray-800/60 p-2 [scrollbar-width:thin]">
            {progressField.groups?.length ? (
              <GroupedOrderList
                groups={progressField.groups}
                seenSet={seenSet}
                onToggleItem={toggleLabel}
                onToggleGroup={toggleGroup}
              />
            ) : (
              <FlatOrderList
                labels={progressField.order}
                seenSet={seenSet}
                onToggleItem={toggleLabel}
              />
            )}
          </div>
        </div>
      ) : null}

      {currentSelection ? (
        <p className="text-center text-sm text-gray-400">
          {playableCount > 0
            ? stripAccents(
                `${playableCount} personnage${playableCount > 1 ? "s" : ""} disponible${playableCount > 1 ? "s" : ""}`,
              )
            : stripAccents("Aucun personnage disponible avec cette sélection.")}
        </p>
      ) : (
        <p className="text-center text-sm text-gray-500">
          {stripAccents("Coche au moins un élément ou choisis « tout vu ».")}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={!currentSelection || playableCount === 0}
      >
        {stripAccents("Jouer")}
      </Button>
    </form>
  );
}
