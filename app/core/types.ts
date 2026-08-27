export type Id = string

export interface TodoItem {
  id: Id
  text: string
  done: boolean
}

export interface Note {
  id: Id
  title: string
  todos: TodoItem[]
  createdAt: number
  updatedAt: number
}
