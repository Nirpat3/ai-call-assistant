import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { KnowledgeBase, InsertKnowledgeBase } from "@shared/schema";
import AppStoreLayout from "@/components/AppStoreLayout";
import { Plus, Search, FileText, Globe, Upload } from "lucide-react";

interface KnowledgeEntryFormProps {
  initialData?: KnowledgeBase;
  onSubmit: (data: InsertKnowledgeBase) => void;
  isLoading: boolean;
}

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const { toast } = useToast();

  // Mock data for now - will be replaced with real API calls
  const knowledgeEntries: KnowledgeBase[] = [
    {
      id: 1,
      title: "Customer Support FAQ",
      content: "Frequently asked questions about our services...",
      source: "manual",
      sourceUrl: null,
      fileName: null,
      fileSize: null,
      documentType: null,
      tags: ["support", "faq"],
      confidence: 90,
      isActive: true,
      organizationId: "org-1",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 2,
      title: "Product Documentation",
      content: "Comprehensive product documentation...",
      source: "file",
      sourceUrl: null,
      fileName: "product-docs.pdf",
      fileSize: 2048000,
      documentType: "pdf",
      tags: ["product", "documentation"],
      confidence: 95,
      isActive: true,
      organizationId: "org-1",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'file': return <Upload className="h-4 w-4" />;
      case 'website': return <Globe className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const filteredEntries = knowledgeEntries.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = sourceFilter === "all" || entry.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  return (
    <AppStoreLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
            <p className="text-muted-foreground">
              Manage AI knowledge entries and documentation
            </p>
          </div>
          <Button className="sm:w-auto w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search knowledge entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="all">All Sources</option>
            <option value="manual">Manual</option>
            <option value="file">File Upload</option>
            <option value="website">Website</option>
          </select>
        </div>

        {/* Knowledge Entries Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {getSourceIcon(entry.source)}
                    <CardTitle className="text-lg line-clamp-2">
                      {entry.title}
                    </CardTitle>
                  </div>
                  <Badge variant={entry.confidence >= 90 ? "default" : "secondary"}>
                    {entry.confidence}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                  {entry.content}
                </p>
                
                {entry.fileName && (
                  <div className="text-xs text-muted-foreground mb-2">
                    <span className="font-medium">File:</span> {entry.fileName}
                    {entry.fileSize && ` (${formatFileSize(entry.fileSize)})`}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {entry.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Source: {entry.source} • Updated {entry.updatedAt.toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEntries.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No knowledge entries</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new knowledge entry.
            </p>
            <div className="mt-6">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppStoreLayout>
  );
}