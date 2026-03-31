import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  ListTodo, 
  Plus, 
  ChevronRight,
  Circle,
  CheckCircle2,
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  MoreHorizontal,
  FolderPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import AppStoreLayout from "@/components/AppStoreLayout";
import { format } from "date-fns";
import type { TodoCategory, InsertTodoCategory, Todo, InsertTodo, TodoCategoryWithTodos } from "@shared/schema";

export default function TodoPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showTodoForm, setShowTodoForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    color: '#3B82F6',
    icon: '📝'
  });
  const [todoForm, setTodoForm] = useState({
    title: '',
    notes: '',
    dueDate: '',
    reminderTime: ''
  });

  const { data: categories = [], isLoading } = useQuery<TodoCategoryWithTodos[]>({
    queryKey: ["/api/todo-categories"],
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: Partial<InsertTodoCategory>) => {
      return await apiRequest("/api/todo-categories", {
        method: "POST",
        body: JSON.stringify(categoryData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todo-categories"] });
      setShowCategoryForm(false);
      setCategoryForm({ name: '', color: '#3B82F6', icon: '📝' });
      toast({
        title: "Category Created",
        description: "Your new todo category has been created."
      });
    }
  });

  const createTodoMutation = useMutation({
    mutationFn: async (todoData: Partial<InsertTodo>) => {
      return await apiRequest("/api/todos", {
        method: "POST",
        body: JSON.stringify(todoData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todo-categories"] });
      setShowTodoForm(false);
      setTodoForm({ title: '', notes: '', dueDate: '', reminderTime: '' });
      toast({
        title: "Todo Created",
        description: "Your new todo has been added."
      });
    }
  });

  const updateTodoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<InsertTodo> }) => {
      return await apiRequest(`/api/todos/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todo-categories"] });
    }
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/todos/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todo-categories"] });
      toast({
        title: "Todo Deleted",
        description: "The todo has been removed."
      });
    }
  });

  const handleCreateCategory = () => {
    if (!categoryForm.name) {
      toast({
        title: "Missing Information",
        description: "Please provide a category name.",
        variant: "destructive"
      });
      return;
    }

    createCategoryMutation.mutate(categoryForm);
  };

  const handleCreateTodo = () => {
    if (!todoForm.title) {
      toast({
        title: "Missing Information",
        description: "Please provide a todo title.",
        variant: "destructive"
      });
      return;
    }

    createTodoMutation.mutate({
      title: todoForm.title,
      note: todoForm.notes || null,
      dueDate: todoForm.dueDate ? new Date(todoForm.dueDate) : null,
      reminderDate: todoForm.reminderTime ? new Date(todoForm.reminderTime) : null,
      reminderEnabled: todoForm.reminderTime ? true : false,
      categoryId: selectedCategory || undefined,
      completed: false,
      priority: 'normal'
    });
  };

  const handleToggleTodo = (todo: Todo) => {
    updateTodoMutation.mutate({
      id: todo.id,
      data: { completed: !todo.completed }
    });
  };

  const currentCategory = selectedCategory 
    ? categories.find(c => c.id === selectedCategory)
    : null;

  const allTodos = categories.flatMap(c => c.todos);
  const displayTodos = selectedCategory 
    ? (currentCategory?.todos || [])
    : allTodos;

  const activeTodos = displayTodos.filter(t => !t.completed);
  const completedTodos = displayTodos.filter(t => t.completed);

  return (
    <AppStoreLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <ListTodo className="h-8 w-8 text-blue-600" />
              {selectedCategory ? currentCategory?.name : 'All Todos'}
            </h1>
            <p className="text-muted-foreground">
              {activeTodos.length} active, {completedTodos.length} completed
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowCategoryForm(true)}
              data-testid="button-create-category"
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              New List
            </Button>
            <Button 
              onClick={() => setShowTodoForm(true)}
              data-testid="button-create-todo"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Todo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-2">
            <div className="space-y-1">
              <Button
                variant={selectedCategory === null ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSelectedCategory(null)}
                data-testid="category-all"
              >
                <ListTodo className="h-4 w-4 mr-2" />
                All
                <Badge variant="secondary" className="ml-auto">
                  {allTodos.length}
                </Badge>
              </Button>

              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory(category.id)}
                  data-testid={`category-${category.id}`}
                >
                  <span className="mr-2">{category.icon || '📝'}</span>
                  <span className="flex-1 text-left">{category.name}</span>
                  <Badge 
                    variant="secondary" 
                    className="ml-auto"
                    style={{ backgroundColor: `${category.color}20`, color: category.color }}
                  >
                    {category.totalCount}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {activeTodos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Active Tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {activeTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                      data-testid={`todo-${todo.id}`}
                    >
                      <button
                        onClick={() => handleToggleTodo(todo)}
                        className="mt-0.5"
                        data-testid={`checkbox-${todo.id}`}
                      >
                        <Circle className="h-5 w-5 text-gray-400 hover:text-blue-600 transition-colors" />
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {todo.title}
                        </div>
                        {todo.note && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {todo.note}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          {todo.dueDate && (
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {format(new Date(todo.dueDate), 'MMM d')}
                            </div>
                          )}
                          {todo.reminderDate && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(todo.reminderDate), 'h:mm a')}
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteTodoMutation.mutate(todo.id)}
                        data-testid={`delete-${todo.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {completedTodos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-gray-500">Completed</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {completedTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group opacity-60"
                      data-testid={`completed-todo-${todo.id}`}
                    >
                      <button
                        onClick={() => handleToggleTodo(todo)}
                        className="mt-0.5"
                        data-testid={`completed-checkbox-${todo.id}`}
                      >
                        <CheckCircle2 className="h-5 w-5 text-blue-600" />
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-500 line-through">
                          {todo.title}
                        </div>
                        {todo.completedAt && (
                          <div className="text-xs text-gray-400 mt-1">
                            Completed {format(new Date(todo.completedAt), 'MMM d, h:mm a')}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteTodoMutation.mutate(todo.id)}
                        data-testid={`delete-completed-${todo.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {displayTodos.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <ListTodo className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No todos yet</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first todo to get started
                  </p>
                  <Button onClick={() => setShowTodoForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Todo
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {showCategoryForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>New List</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="categoryName">List Name</Label>
                  <Input
                    id="categoryName"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Work, Personal, Shopping"
                    data-testid="input-category-name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="categoryIcon">Icon</Label>
                  <Input
                    id="categoryIcon"
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder="📝"
                    maxLength={2}
                    data-testid="input-category-icon"
                  />
                </div>
                
                <div>
                  <Label htmlFor="categoryColor">Color</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="categoryColor"
                      type="color"
                      value={categoryForm.color}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                      className="w-20 h-10"
                      data-testid="input-category-color"
                    />
                    <span className="text-sm text-gray-600">{categoryForm.color}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleCreateCategory}
                    disabled={createCategoryMutation.isPending}
                    className="flex-1"
                    data-testid="button-save-category"
                  >
                    {createCategoryMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCategoryForm(false)}
                    className="flex-1"
                    data-testid="button-cancel-category"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {showTodoForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>New Todo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="todoTitle">Title</Label>
                  <Input
                    id="todoTitle"
                    value={todoForm.title}
                    onChange={(e) => setTodoForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="What needs to be done?"
                    data-testid="input-todo-title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="todoNotes">Notes</Label>
                  <Textarea
                    id="todoNotes"
                    value={todoForm.notes}
                    onChange={(e) => setTodoForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional details (optional)"
                    data-testid="input-todo-notes"
                  />
                </div>
                
                <div>
                  <Label htmlFor="todoDueDate">Due Date</Label>
                  <Input
                    id="todoDueDate"
                    type="date"
                    value={todoForm.dueDate}
                    onChange={(e) => setTodoForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    data-testid="input-todo-duedate"
                  />
                </div>
                
                <div>
                  <Label htmlFor="todoReminder">Reminder Time</Label>
                  <Input
                    id="todoReminder"
                    type="datetime-local"
                    value={todoForm.reminderTime}
                    onChange={(e) => setTodoForm(prev => ({ ...prev, reminderTime: e.target.value }))}
                    data-testid="input-todo-reminder"
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleCreateTodo}
                    disabled={createTodoMutation.isPending}
                    className="flex-1"
                    data-testid="button-save-todo"
                  >
                    {createTodoMutation.isPending ? 'Creating...' : 'Add Todo'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowTodoForm(false)}
                    className="flex-1"
                    data-testid="button-cancel-todo"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppStoreLayout>
  );
}
