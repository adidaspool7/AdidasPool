"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { Skeleton } from "@client/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";

// ── Colour palettes ──────────────────────────────────────────────
const FUNNEL_COLORS = [
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  "#22c55e", "#f97316", "#06b6d4", "#ef4444", "#64748b", "#10b981",
];
const PIE_COLORS = [
  "#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444",
  "#06b6d4", "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6",
];
const SCORE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];

// ── Types ────────────────────────────────────────────────────────
interface AnalyticsData {
  overview: {
    totalCandidates: number;
    openPositions: number;
    totalApplications: number;
    shortlisted: number;
    assessments: number;
  };
  pipeline: { status: string; count: number }[];
  candidatesByCountry: { country: string; count: number }[];
  topSkills: { skill: string; count: number }[];
  topLanguages: { language: string; count: number }[];
  applicationsPerJob: { jobTitle: string; count: number }[];
  applicationTrend: { date: string; count: number }[];
  scoreDistribution: { range: string; count: number }[];
}

// ── Label helpers ────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  PARSED: "Parsed",
  SCREENED: "Screened",
  INVITED: "Invited",
  ASSESSED: "Assessed",
  SHORTLISTED: "Shortlisted",
  BORDERLINE: "Borderline",
  ON_IMPROVEMENT_TRACK: "On Track",
  REJECTED: "Rejected",
  HIRED: "Hired",
};

function truncate(str: string, max = 18) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

// ── Main Component ───────────────────────────────────────────────
export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch analytics");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AnalyticsSkeleton />;
  if (error) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <CardContent className="p-8 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!data) return null;

  const pipelineData = data.pipeline
    .filter((p) => p.count > 0)
    .map((p, i) => ({
      name: STATUS_LABELS[p.status] || p.status,
      value: p.count,
      fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
    }));

  const hasScores = data.scoreDistribution.some((s) => s.count > 0);
  const hasTrend = data.applicationTrend.length > 0;

  return (
    <div className="space-y-6">
      <Header />

      {/* ── Overview Cards ─────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Candidates" value={data.overview.totalCandidates} />
        <StatCard label="Open Positions" value={data.overview.openPositions} />
        <StatCard label="Applications" value={data.overview.totalApplications} />
        <StatCard label="Shortlisted" value={data.overview.shortlisted} />
        <StatCard label="Assessments" value={data.overview.assessments} />
      </div>

      {/* ── Row 1: Pipeline + Country ─────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Candidate Pipeline Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Candidate Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineData.length === 0 ? (
              <EmptyState message="No candidates yet" />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <FunnelChart>
                  <Tooltip />
                  <Funnel dataKey="value" data={pipelineData} isAnimationActive>
                    <LabelList
                      position="right"
                      fill="#888"
                      stroke="none"
                      dataKey="name"
                      fontSize={12}
                    />
                    <LabelList
                      position="center"
                      fill="#fff"
                      stroke="none"
                      dataKey="value"
                      fontSize={13}
                      fontWeight={600}
                    />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Candidates by Country pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Candidates by Country</CardTitle>
          </CardHeader>
          <CardContent>
            {data.candidatesByCountry.length === 0 ? (
              <EmptyState message="No country data" />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={data.candidatesByCountry}
                    dataKey="count"
                    nameKey="country"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label={({ name, value }: any) =>
                      `${truncate(String(name), 12)} (${value})`
                    }
                    labelLine={false}
                  >
                    {data.candidatesByCountry.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Top Skills + Languages + Applications per Job ──────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top Skills bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Skills</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topSkills.length === 0 ? (
              <EmptyState message="No skills data" />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={data.topSkills}
                  layout="vertical"
                  margin={{ left: 80, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="skill"
                    width={75}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Candidate Languages bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Candidate Languages</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topLanguages.length === 0 ? (
              <EmptyState message="No language data" />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={data.topLanguages}
                  layout="vertical"
                  margin={{ left: 80, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="language"
                    width={75}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Applications per Job */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Applications per Job (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.applicationsPerJob.length === 0 ? (
              <EmptyState message="No applications yet" />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={data.applicationsPerJob}
                  layout="vertical"
                  margin={{ left: 100, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="jobTitle"
                    width={95}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => truncate(v, 16)}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Application Trend + Score Distribution ─────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Application trend (last 30 days) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Applications (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasTrend ? (
              <EmptyState message="No recent applications" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={data.applicationTrend}
                  margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v.slice(5)} // MM-DD
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* CV Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CV Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasScores ? (
              <EmptyState message="No scored candidates yet" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data.scoreDistribution}
                  margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.scoreDistribution.map((_, i) => (
                      <Cell
                        key={i}
                        fill={SCORE_COLORS[i % SCORE_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function Header() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
      <p className="text-muted-foreground">
        Recruitment funnel, score distributions, and talent pool insights.
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[280px]">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <Header />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-[300px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
