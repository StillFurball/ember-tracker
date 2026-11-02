export type TaskType = 'activity' | 'assignment';

export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskStatus = 'pending' | 'completed';

export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export type TaskSort = 'priority' | 'due_date';

export type Task = {
    id: number;
    title: string;
    description: string | null;
    type: TaskType;
    priority: TaskPriority;
    status: TaskStatus;
    recurrence: TaskRecurrence;
    due_date: string | null;
    start_time: string | null;
    end_time: string | null;
    created_at: string;
    updated_at: string;
};

export type HabitFrequency = 'daily' | 'weekly';

export type Habit = {
    id: number;
    name: string;
    frequency: HabitFrequency;
    target_count: number;
    current_period_count: number;
    streak: number;
    history: { date: string; count: number }[];
};
