import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  ShieldCheck,
  Zap,
  Cpu,
  Code,
  Layout,
  Users,
  Award,
  Upload,
  FileText,
  Clock,
  Video,
  Image,
  Github,
  ExternalLink,
  TrendingDown,
  Activity,
  Bot,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  category: string;
  completed: boolean;
  icon: any;
  description?: string;
}

export const HackathonChecklist: React.FC = () => {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem('hackathon_checklist');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CHECKLIST;
  });

  const checklistCategories = [
    { id: 'core', label: 'Core Requirements', icon: Award, color: 'bg-[#123D32]' },
    { id: 'features', label: 'Feature Checklist', icon: Zap, color: 'bg-[#4E9C65]' },
    { id: 'tech', label: 'Technical Checklist', icon: Cpu, color: 'bg-[#6366F1]' },
    { id: 'submission', label: 'Submission Items', icon: Upload, color: 'bg-[#D97706]' },
  ];

  const DEFAULT_CHECKLIST: ChecklistItem[] = [
    // Core Requirements
    { id: 'theme', label: 'Addresses Hackathon Theme', category: 'core', completed: false, icon: Award, description: 'Clearly demonstrates alignment with the hackathon theme' },
    { id: 'innovation', label: 'Innovation Factor', category: 'core', completed: false, icon: Zap, description: 'Shows creative problem-solving approach' },
    { id: 'feasibility', label: 'Technical Feasibility', category: 'core', completed: false, icon: ShieldCheck, description: 'Demonstrates realistic implementation' },
    
    // Features
    { id: 'calculator', label: 'Energy Calculator Working', category: 'features', completed: false, icon: Zap, description: 'WattWise engine calculates kWh and costs accurately' },
    { id: 'optimizer', label: 'Budget Optimizer Functional', category: 'features', completed: false, icon: TrendingDown, description: '0/1 Knapsack algorithm provides optimal recommendations' },
    { id: 'simulator', label: 'What-If Simulator Active', category: 'features', completed: false, icon: Activity, description: 'Users can test different scenarios' },
    { id: 'ai_chat', label: 'AI Chat Interface', category: 'features', completed: false, icon: Bot, description: 'Conversational AI assistant integrated' },
    { id: 'mcp', label: 'MCP Tools Connected', category: 'features', completed: false, icon: Cpu, description: 'Streamable HTTP MCP tools working' },
    
    // Technical
    { id: 'ui_polished', label: 'UI/UX Polished', category: 'tech', completed: false, icon: Layout, description: 'Clean, responsive design with good accessibility' },
    { id: 'code_quality', label: 'Code Quality', category: 'tech', completed: false, icon: Code, description: 'Clean, well-structured, documented code' },
    { id: 'error_handling', label: 'Error Handling', category: 'tech', completed: false, icon: ShieldCheck, description: 'Graceful error states and user feedback' },
    { id: 'performance', label: 'Performance Optimized', category: 'tech', completed: false, icon: Zap, description: 'Fast load times and smooth interactions' },
    
    // Submission
    { id: 'demo_video', label: 'Demo Video Ready', category: 'submission', completed: false, icon: Video, description: '2-3 minute walkthrough of key features' },
    { id: 'pitch_deck', label: 'Pitch Deck Slides', category: 'submission', completed: false, icon: FileText, description: 'Clear problem-solution-impact narrative' },
    { id: 'screenshots', label: 'Screenshots/Visuals', category: 'submission', completed: false, icon: Image, description: 'High-quality screenshots of the app' },
    { id: 'github_repo', label: 'GitHub Repository Public', category: 'submission', completed: false, icon: Github, description: 'Readme with setup instructions' },
    { id: 'deployed_link', label: 'Live Demo Link', category: 'submission', completed: false, icon: ExternalLink, description: 'Working deployed application' },
    { id: 'team_info', label: 'Team Information', category: 'submission', completed: false, icon: Users, description: 'Team members and roles documented' },
  ];

  const handleToggle = (id: string) => {
    setChecklist((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      try {
        localStorage.setItem('hackathon_checklist', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const resetChecklist = () => {
    setChecklist(DEFAULT_CHECKLIST);
    try {
      localStorage.removeItem('hackathon_checklist');
    } catch {}
  };

  const completedCount = checklist.filter((item) => item.completed).length;
  const totalCount = checklist.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white p-6 rounded-3xl border border-[#E5E9E4] shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-[#E8F9BE] text-[#173F35]">
            <CheckCircle2 className="w-5 h-5" />
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#172C26] tracking-tight">
            Hackathon Submission Checklist
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#69766F] max-w-3xl">
          Track your hackathon submission progress. Check off items as you complete them to ensure you're ready for submission.
        </p>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-[#172C26]">Overall Progress</span>
            <span className="font-mono text-[#173F35]">
              {completedCount}/{totalCount} ({progressPercent}%)
            </span>
          </div>
          <div className="h-3 bg-[#F8F8F2] rounded-full overflow-hidden border border-[#E5E9E4]">
            <div
              className="h-full bg-[#173F35] transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={resetChecklist}
          className="mt-4 text-xs font-semibold text-[#69766F] hover:text-[#172C26] flex items-center gap-1.5 cursor-pointer"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Reset Checklist</span>
        </button>
      </div>

      {/* Checklist Categories */}
      {checklistCategories.map((category) => {
        const CategoryIcon = category.icon;
        const categoryItems = checklist.filter((item) => item.category === category.id);
        const categoryCompleted = categoryItems.filter((item) => item.completed).length;
        const categoryTotal = categoryItems.length;
        const categoryProgress = Math.round((categoryCompleted / categoryTotal) * 100);

        return (
          <div key={category.id} className="bg-white border border-[#E5E9E4] rounded-3xl overflow-hidden shadow-xs">
            {/* Category Header */}
            <div className={`px-6 py-4 ${category.color} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <CategoryIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{category.label}</h3>
                  <p className="text-[10px] text-white/80">
                    {categoryCompleted}/{categoryTotal} completed
                  </p>
                </div>
              </div>
              <div className="text-xs font-mono text-white bg-white/20 px-3 py-1 rounded-full">
                {categoryProgress}%
              </div>
            </div>

            {/* Checklist Items */}
            <div className="p-4 space-y-2">
              {categoryItems.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggle(item.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      item.completed
                        ? 'bg-[#E8F9BE] border-[#173F35]'
                        : 'bg-[#F8F8F2] border-[#E5E9E4] hover:border-[#173F35]/50'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {item.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-[#173F35]" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#69766F]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <ItemIcon className="w-4 h-4 text-[#173F35] shrink-0" />
                        <span
                          className={`text-sm font-semibold ${
                            item.completed ? 'text-[#173F35]' : 'text-[#172C26]'
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-[#69766F] mt-1 leading-snug">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Submission Tips */}
      <div className="bg-[#173F35] p-6 rounded-3xl shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-5 h-5 text-[#C9F36A]" />
          <h3 className="text-sm font-bold text-white">Pro Tips for Submission</h3>
        </div>
        <ul className="space-y-2 text-xs text-white/90">
          <li className="flex items-start gap-2">
            <span className="text-[#C9F36A]">•</span>
            <span>Record your demo video early - it often takes longer than expected</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#C9F36A]">•</span>
            <span>Test your live demo link on different browsers before submission</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#C9F36A]">•</span>
            <span>Ensure your GitHub repo has a clear README with setup instructions</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#C9F36A]">•</span>
            <span>Double-check all submission links are public and accessible</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
