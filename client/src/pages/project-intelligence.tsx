import { useMemo, useState } from "react";
import type { ElementType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Briefcase,
  CheckCircle2,
  GitBranch,
  Link as LinkIcon,
  Milestone,
  Plus,
  Target,
  Users,
} from "lucide-react";
import AppStoreLayout from "@/components/AppStoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ProjectGoalWithDetails, Todo } from "@shared/schema";

type ProjectIntelligenceResponse = {
  goals: ProjectGoalWithDetails[];
  summary: {
    totalGoals: number;
    activeGoals: number;
    totalTasks: number;
    completedTasks: number;
    completionPercent: number;
    openBottlenecks: number;
    aiInsightCount: number;
  };
};

const departments = ["Design", "iOS", "Backend", "Android", "QA", "Product", "Operations"];
const stageNames = ["Discovery", "Design", "Build", "Review", "QA", "Release"];

const statusTone: Record<string, string> = {
  planning: "bg-slate-100 text-slate-700",
  active: "bg-blue-100 text-blue-700",
  in_progress: "bg-blue-100 text-blue-700",
  at_risk: "bg-amber-100 text-amber-800",
  blocked: "bg-red-100 text-red-700",
  complete: "bg-emerald-100 text-emerald-700",
  achieved: "bg-emerald-100 text-emerald-700",
  tracking: "bg-sky-100 text-sky-700",
};

function statusClass(status: string) {
  return statusTone[status] || "bg-slate-100 text-slate-700";
}

export default function ProjectIntelligencePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [goalForm, setGoalForm] = useState({
    title: "",
    description: "",
    ownerDepartment: "Product",
    targetDate: "",
    successMetric: "",
  });
  const [workstreamForm, setWorkstreamForm] = useState({
    name: "",
    department: "Design",
    owner: "",
    platform: "",
  });
  const [stageForm, setStageForm] = useState({
    name: "Discovery",
    workstreamId: "",
    dueDate: "",
  });
  const [taskLinkForm, setTaskLinkForm] = useState({
    todoId: "",
    workstreamId: "",
    stageId: "",
  });
  const [dependencyForm, setDependencyForm] = useState({
    todoId: "",
    dependsOnTodoId: "",
  });
  const [kpiForm, setKpiForm] = useState({
    name: "",
    target: "100",
    current: "0",
    unit: "%",
  });

  const { data, isLoading } = useQuery<ProjectIntelligenceResponse>({
    queryKey: ["/api/project-intelligence"],
  });

  const { data: todos = [] } = useQuery<Todo[]>({
    queryKey: ["/api/todos"],
  });

  const goals = data?.goals || [];
  const selectedGoal = useMemo(() => {
    if (goals.length === 0) return null;
    return goals.find((goal) => goal.id === selectedGoalId) || goals[0];
  }, [goals, selectedGoalId]);

  const linkedTodoIds = new Set(selectedGoal?.taskLinks.map((link) => link.todoId) || []);
  const linkableTodos = todos.filter((todo) => !linkedTodoIds.has(todo.id));
  const linkedTodos = selectedGoal?.taskLinks.map((link) => link.todo).filter(Boolean) as Todo[] | undefined;

  const invalidateProject = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/project-intelligence"] });
    queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
  };

  const createGoalMutation = useMutation({
    mutationFn: async () => apiRequest("/api/project-goals", {
      method: "POST",
      body: JSON.stringify({
        title: goalForm.title,
        description: goalForm.description || null,
        ownerDepartment: goalForm.ownerDepartment,
        targetDate: goalForm.targetDate || null,
        successMetric: goalForm.successMetric || null,
        status: "active",
      }),
    }),
    onSuccess: (goal) => {
      invalidateProject();
      setSelectedGoalId(goal.id);
      setGoalForm({ title: "", description: "", ownerDepartment: "Product", targetDate: "", successMetric: "" });
      toast({ title: "Goal created", description: "Project goal is ready for teams and tasks." });
    },
  });

  const createWorkstreamMutation = useMutation({
    mutationFn: async () => apiRequest("/api/project-workstreams", {
      method: "POST",
      body: JSON.stringify({
        goalId: selectedGoal?.id,
        name: workstreamForm.name,
        department: workstreamForm.department,
        owner: workstreamForm.owner || null,
        platform: workstreamForm.platform || null,
        status: "in_progress",
        order: selectedGoal?.workstreams.length || 0,
      }),
    }),
    onSuccess: () => {
      invalidateProject();
      setWorkstreamForm({ name: "", department: "Design", owner: "", platform: "" });
      toast({ title: "Workstream added", description: "Team ownership is now part of the project flow." });
    },
  });

  const createStageMutation = useMutation({
    mutationFn: async () => apiRequest("/api/project-stages", {
      method: "POST",
      body: JSON.stringify({
        goalId: selectedGoal?.id,
        workstreamId: stageForm.workstreamId ? Number(stageForm.workstreamId) : null,
        name: stageForm.name,
        dueDate: stageForm.dueDate || null,
        status: "not_started",
        order: selectedGoal?.stages.length || 0,
      }),
    }),
    onSuccess: () => {
      invalidateProject();
      setStageForm({ name: "Discovery", workstreamId: "", dueDate: "" });
      toast({ title: "Stage added", description: "Stage tracking is available on the project dashboard." });
    },
  });

  const linkTaskMutation = useMutation({
    mutationFn: async () => apiRequest("/api/project-task-links", {
      method: "POST",
      body: JSON.stringify({
        goalId: selectedGoal?.id,
        todoId: Number(taskLinkForm.todoId),
        workstreamId: taskLinkForm.workstreamId ? Number(taskLinkForm.workstreamId) : null,
        stageId: taskLinkForm.stageId ? Number(taskLinkForm.stageId) : null,
        role: "execution",
      }),
    }),
    onSuccess: () => {
      invalidateProject();
      setTaskLinkForm({ todoId: "", workstreamId: "", stageId: "" });
      toast({ title: "Task linked", description: "The existing todo now contributes to project reporting." });
    },
  });

  const createDependencyMutation = useMutation({
    mutationFn: async () => apiRequest("/api/project-task-dependencies", {
      method: "POST",
      body: JSON.stringify({
        goalId: selectedGoal?.id,
        todoId: Number(dependencyForm.todoId),
        dependsOnTodoId: Number(dependencyForm.dependsOnTodoId),
        dependencyType: "finish_to_start",
        status: "active",
      }),
    }),
    onSuccess: () => {
      invalidateProject();
      setDependencyForm({ todoId: "", dependsOnTodoId: "" });
      toast({ title: "Dependency added", description: "Bottleneck detection can now track this blocker." });
    },
  });

  const createKpiMutation = useMutation({
    mutationFn: async () => apiRequest("/api/project-kpis", {
      method: "POST",
      body: JSON.stringify({
        goalId: selectedGoal?.id,
        name: kpiForm.name,
        target: kpiForm.target,
        current: kpiForm.current,
        unit: kpiForm.unit,
      }),
    }),
    onSuccess: () => {
      invalidateProject();
      setKpiForm({ name: "", target: "100", current: "0", unit: "%" });
      toast({ title: "KPI added", description: "Performance tracking is attached to the goal." });
    },
  });

  const seedInsightMutation = useMutation({
    mutationFn: async () => apiRequest("/api/project-ai-insights", {
      method: "POST",
      body: JSON.stringify({
        goalId: selectedGoal?.id,
        insightType: "risk",
        title: selectedGoal?.bottlenecks.length ? "Execution bottleneck detected" : "Project learning baseline created",
        description: selectedGoal?.bottlenecks.length
          ? `${selectedGoal.bottlenecks.length} blocker signals were found from linked tasks and dependencies.`
          : "AI will learn from task completion, overdue patterns, dependencies, and team throughput as project history builds.",
        severity: selectedGoal?.bottlenecks.length ? "high" : "medium",
        recommendedAction: selectedGoal?.bottlenecks[0]?.detail || "Keep linking team tasks and dependencies so future reports improve.",
        sourceData: {
          completionPercent: selectedGoal?.completionPercent || 0,
          bottlenecks: selectedGoal?.bottlenecks || [],
        },
      }),
    }),
    onSuccess: () => {
      invalidateProject();
      toast({ title: "AI insight captured", description: "The project learning signal was saved." });
    },
  });

  const canCreateGoal = goalForm.title.trim().length > 0;
  const canAddWorkstream = Boolean(selectedGoal && workstreamForm.name.trim());
  const canAddStage = Boolean(selectedGoal && stageForm.name.trim());
  const canLinkTask = Boolean(selectedGoal && taskLinkForm.todoId);
  const canAddDependency = Boolean(selectedGoal && dependencyForm.todoId && dependencyForm.dependsOnTodoId && dependencyForm.todoId !== dependencyForm.dependsOnTodoId);
  const canAddKpi = Boolean(selectedGoal && kpiForm.name.trim());

  return (
    <AppStoreLayout>
      <div className="container mx-auto max-w-7xl p-4 sm:p-6 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Briefcase className="h-8 w-8 text-blue-600" />
              Project Intelligence
            </h1>
            <p className="text-muted-foreground">
              Goals, team workstreams, stages, dependencies, KPIs, and AI learning built on existing todos.
            </p>
          </div>

          {goals.length > 0 && (
            <Select value={String(selectedGoal?.id || "")} onValueChange={(value) => setSelectedGoalId(Number(value))}>
              <SelectTrigger className="w-full lg:w-80" data-testid="select-project-goal">
                <SelectValue placeholder="Select project goal" />
              </SelectTrigger>
              <SelectContent>
                {goals.map((goal) => (
                  <SelectItem key={goal.id} value={String(goal.id)}>
                    {goal.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard icon={Target} label="Active Goals" value={data?.summary.activeGoals || 0} detail={`${data?.summary.totalGoals || 0} total`} />
          <MetricCard icon={CheckCircle2} label="Task Completion" value={`${data?.summary.completionPercent || 0}%`} detail={`${data?.summary.completedTasks || 0}/${data?.summary.totalTasks || 0} done`} />
          <MetricCard icon={AlertTriangle} label="Bottlenecks" value={data?.summary.openBottlenecks || 0} detail="From due dates and dependencies" />
          <MetricCard icon={Bot} label="AI Signals" value={data?.summary.aiInsightCount || 0} detail="Saved learning records" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Goal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="goal-title">Feature or Goal</Label>
                <Input
                  id="goal-title"
                  value={goalForm.title}
                  onChange={(event) => setGoalForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Checkout redesign"
                  data-testid="input-project-goal-title"
                />
              </div>
              <div>
                <Label htmlFor="goal-department">Owning Department</Label>
                <Select value={goalForm.ownerDepartment} onValueChange={(value) => setGoalForm((prev) => ({ ...prev, ownerDepartment: value }))}>
                  <SelectTrigger id="goal-department">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department} value={department}>{department}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="goal-target">Target Date</Label>
                <Input
                  id="goal-target"
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(event) => setGoalForm((prev) => ({ ...prev, targetDate: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="goal-metric">Success Metric</Label>
                <Input
                  id="goal-metric"
                  value={goalForm.successMetric}
                  onChange={(event) => setGoalForm((prev) => ({ ...prev, successMetric: event.target.value }))}
                  placeholder="Release-ready build approved"
                />
              </div>
              <div>
                <Label htmlFor="goal-description">Description</Label>
                <Textarea
                  id="goal-description"
                  value={goalForm.description}
                  onChange={(event) => setGoalForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="What teams need to deliver together"
                />
              </div>
              <Button className="w-full" disabled={!canCreateGoal || createGoalMutation.isPending} onClick={() => createGoalMutation.mutate()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Goal
              </Button>
            </CardContent>
          </Card>

          <div className="xl:col-span-2 space-y-6">
            {isLoading && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">Loading project ecosystem...</CardContent>
              </Card>
            )}

            {!isLoading && !selectedGoal && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold">No project goals yet</h3>
                  <p className="text-muted-foreground">Create one goal, then attach team workstreams and existing tasks.</p>
                </CardContent>
              </Card>
            )}

            {selectedGoal && (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle>{selectedGoal.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{selectedGoal.description || "No description provided"}</p>
                      </div>
                      <Badge className={statusClass(selectedGoal.status)}>{selectedGoal.status.replace("_", " ")}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Overall completion</span>
                      <span className="font-medium">{selectedGoal.completionPercent}%</span>
                    </div>
                    <Progress value={selectedGoal.completionPercent} />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <MiniStat label="Owner" value={selectedGoal.ownerDepartment} />
                      <MiniStat label="Tasks" value={`${selectedGoal.completedTasks}/${selectedGoal.totalTasks}`} />
                      <MiniStat label="Overdue" value={selectedGoal.overdueTasks} />
                      <MiniStat label="Blocked" value={selectedGoal.blockedTasks} />
                    </div>
                  </CardContent>
                </Card>

                <Tabs defaultValue="flow" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="flow">Flow</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="kpis">KPIs</TabsTrigger>
                    <TabsTrigger value="ai">AI</TabsTrigger>
                  </TabsList>

                  <TabsContent value="flow" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Add Team Workstream</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Input value={workstreamForm.name} onChange={(event) => setWorkstreamForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="iOS checkout build" />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Select value={workstreamForm.department} onValueChange={(value) => setWorkstreamForm((prev) => ({ ...prev, department: value }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>{departments.map((department) => <SelectItem key={department} value={department}>{department}</SelectItem>)}</SelectContent>
                            </Select>
                            <Input value={workstreamForm.platform} onChange={(event) => setWorkstreamForm((prev) => ({ ...prev, platform: event.target.value }))} placeholder="iOS, API, Android" />
                          </div>
                          <Input value={workstreamForm.owner} onChange={(event) => setWorkstreamForm((prev) => ({ ...prev, owner: event.target.value }))} placeholder="Owner" />
                          <Button className="w-full" disabled={!canAddWorkstream || createWorkstreamMutation.isPending} onClick={() => createWorkstreamMutation.mutate()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Workstream
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2"><Milestone className="h-4 w-4" /> Add Stage</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Select value={stageForm.name} onValueChange={(value) => setStageForm((prev) => ({ ...prev, name: value }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{stageNames.map((stage) => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}</SelectContent>
                          </Select>
                          <Select value={stageForm.workstreamId || "none"} onValueChange={(value) => setStageForm((prev) => ({ ...prev, workstreamId: value === "none" ? "" : value }))}>
                            <SelectTrigger><SelectValue placeholder="Workstream" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Goal level</SelectItem>
                              {selectedGoal.workstreams.map((workstream) => (
                                <SelectItem key={workstream.id} value={String(workstream.id)}>{workstream.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input type="date" value={stageForm.dueDate} onChange={(event) => setStageForm((prev) => ({ ...prev, dueDate: event.target.value }))} />
                          <Button className="w-full" disabled={!canAddStage || createStageMutation.isPending} onClick={() => createStageMutation.mutate()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Stage
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Team Progress</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedGoal.workstreams.length === 0 && <p className="text-sm text-muted-foreground">Add design, iOS, backend, Android, or other team workstreams.</p>}
                        {selectedGoal.workstreams.map((workstream) => (
                          <div key={workstream.id} className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-medium">{workstream.name}</div>
                                <div className="text-xs text-muted-foreground">{workstream.department}{workstream.platform ? ` / ${workstream.platform}` : ""}</div>
                              </div>
                              <Badge className={statusClass(workstream.status)}>{workstream.completionPercent}%</Badge>
                            </div>
                            <Progress value={workstream.completionPercent} />
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Stages</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedGoal.stages.length === 0 && <p className="text-sm text-muted-foreground">Add stages to visualize the journey from discovery through release.</p>}
                        {selectedGoal.stages.map((stage) => (
                          <div key={stage.id} className="border rounded-lg p-3">
                            <div className="font-medium">{stage.name}</div>
                            <div className="text-xs text-muted-foreground">{selectedGoal.workstreams.find((workstream) => workstream.id === stage.workstreamId)?.name || "Goal level"}</div>
                            <Badge className={`mt-2 ${statusClass(stage.status)}`}>{stage.status.replace("_", " ")}</Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="tasks" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Link Existing Todo</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                        <Select value={taskLinkForm.todoId} onValueChange={(value) => setTaskLinkForm((prev) => ({ ...prev, todoId: value }))}>
                          <SelectTrigger><SelectValue placeholder="Todo" /></SelectTrigger>
                          <SelectContent>
                            {linkableTodos.map((todo) => <SelectItem key={todo.id} value={String(todo.id)}>{todo.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={taskLinkForm.workstreamId || "none"} onValueChange={(value) => setTaskLinkForm((prev) => ({ ...prev, workstreamId: value === "none" ? "" : value }))}>
                          <SelectTrigger><SelectValue placeholder="Workstream" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No workstream</SelectItem>
                            {selectedGoal.workstreams.map((workstream) => <SelectItem key={workstream.id} value={String(workstream.id)}>{workstream.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={taskLinkForm.stageId || "none"} onValueChange={(value) => setTaskLinkForm((prev) => ({ ...prev, stageId: value === "none" ? "" : value }))}>
                          <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No stage</SelectItem>
                            {selectedGoal.stages.map((stage) => <SelectItem key={stage.id} value={String(stage.id)}>{stage.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button disabled={!canLinkTask || linkTaskMutation.isPending} onClick={() => linkTaskMutation.mutate()}>
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Link
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><GitBranch className="h-4 w-4" /> Add Dependency</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <Select value={dependencyForm.todoId} onValueChange={(value) => setDependencyForm((prev) => ({ ...prev, todoId: value }))}>
                          <SelectTrigger><SelectValue placeholder="Blocked task" /></SelectTrigger>
                          <SelectContent>{(linkedTodos || []).map((todo) => <SelectItem key={todo.id} value={String(todo.id)}>{todo.title}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={dependencyForm.dependsOnTodoId} onValueChange={(value) => setDependencyForm((prev) => ({ ...prev, dependsOnTodoId: value }))}>
                          <SelectTrigger><SelectValue placeholder="Depends on" /></SelectTrigger>
                          <SelectContent>{(linkedTodos || []).map((todo) => <SelectItem key={todo.id} value={String(todo.id)}>{todo.title}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button disabled={!canAddDependency || createDependencyMutation.isPending} onClick={() => createDependencyMutation.mutate()}>
                          <GitBranch className="h-4 w-4 mr-2" />
                          Add Dependency
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Linked Tasks</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {selectedGoal.taskLinks.length === 0 && <p className="text-sm text-muted-foreground">Link existing todos so task execution, reporting, and bottlenecks stay in one ecosystem.</p>}
                        {selectedGoal.taskLinks.map((link) => (
                          <div key={link.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                            <div>
                              <div className="font-medium">{link.todo?.title || "Missing todo"}</div>
                              <div className="text-xs text-muted-foreground">
                                {selectedGoal.workstreams.find((workstream) => workstream.id === link.workstreamId)?.name || "No workstream"} / {selectedGoal.stages.find((stage) => stage.id === link.stageId)?.name || "No stage"}
                              </div>
                            </div>
                            <Badge className={link.todo?.completed ? statusClass("complete") : statusClass("active")}>
                              {link.todo?.completed ? "complete" : "open"}
                            </Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="kpis" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Add KPI</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <Input className="md:col-span-2" value={kpiForm.name} onChange={(event) => setKpiForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Crash-free sessions" />
                        <Input value={kpiForm.current} onChange={(event) => setKpiForm((prev) => ({ ...prev, current: event.target.value }))} placeholder="Current" />
                        <Input value={kpiForm.target} onChange={(event) => setKpiForm((prev) => ({ ...prev, target: event.target.value }))} placeholder="Target" />
                        <Button disabled={!canAddKpi || createKpiMutation.isPending} onClick={() => createKpiMutation.mutate()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add KPI
                        </Button>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedGoal.kpis.length === 0 && <p className="text-sm text-muted-foreground">Add KPIs to track delivery quality, readiness, or performance targets.</p>}
                      {selectedGoal.kpis.map((kpi) => {
                        const current = Number(kpi.current);
                        const target = Number(kpi.target);
                        const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
                        return (
                          <Card key={kpi.id}>
                            <CardContent className="pt-6 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{kpi.name}</div>
                                <Badge className={statusClass(kpi.status)}>{kpi.status}</Badge>
                              </div>
                              <Progress value={percent} />
                              <div className="text-sm text-muted-foreground">{current}{kpi.unit} of {target}{kpi.unit}</div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>

                  <TabsContent value="ai" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" /> AI Learning and Bottlenecks</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Button variant="outline" onClick={() => seedInsightMutation.mutate()} disabled={seedInsightMutation.isPending}>
                          <Bot className="h-4 w-4 mr-2" />
                          Capture Current Insight
                        </Button>
                        <div className="space-y-2">
                          {selectedGoal.bottlenecks.length === 0 && <p className="text-sm text-muted-foreground">No bottlenecks detected from linked tasks yet.</p>}
                          {selectedGoal.bottlenecks.map((bottleneck, index) => (
                            <div key={`${bottleneck.type}-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                              <div className="font-medium text-amber-900">{bottleneck.label}</div>
                              <div className="text-sm text-amber-800">{bottleneck.detail}</div>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2">
                          {selectedGoal.aiInsights.map((insight) => (
                            <div key={insight.id} className="rounded-lg border p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-medium">{insight.title}</div>
                                <Badge className={statusClass(insight.severity)}>{insight.severity}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">{insight.description}</div>
                              {insight.recommendedAction && <div className="text-sm mt-2">{insight.recommendedAction}</div>}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>
      </div>
    </AppStoreLayout>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: ElementType; label: string; value: string | number; detail: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-2xl font-semibold mt-1">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{detail}</div>
          </div>
          <Icon className="h-8 w-8 text-blue-600" />
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold mt-1">{value}</div>
    </div>
  );
}
