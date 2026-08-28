import { useSyncExternalStore } from "react";

export interface AgentTask {
  id: string;
  label: string;
}

let tasks: AgentTask[] = [];
const listeners = new Set<() => void>();

function emit() {
  tasks = [...tasks];
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const emptySnapshot: AgentTask[] = [];

export function startAgentTask(label = "Vela is securely coordinating your care plan…") {
  const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  tasks.push({ id, label });
  emit();
  return id;
}

export function endAgentTask(id: string) {
  tasks = tasks.filter((t) => t.id !== id);
  emit();
}

export function useAgentTasks(): AgentTask[] {
  return useSyncExternalStore(
    subscribe,
    () => tasks,
    () => emptySnapshot,
  );
}
