import { useState, useMemo } from 'react';
import { GitCompare, Brain, Info, ChevronRight, Sparkles, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, statusColor } from '@/utils/helpers';
import { compareHealthReports } from '@/services/aiService';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export function ReportComparisonPage() {
  const { state } = useApp();
  const { navigate } = useRouter();
  const [prevId, setPrevId] = useState('');
  const [currId, setCurrId] = useState('');

  const sortedReports = useMemo(() =>
    [...state.reports].sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()),
  [state.reports]);

  const reportOptions = sortedReports.map((r) => ({ value: r.id, label: `${r.title} — ${formatDate(r.reportDate)}` }));

  const prevReport = sortedReports.find((r) => r.id === prevId) ?? null;
  const currReport = sortedReports.find((r) => r.id === currId) ?? null;

  const comparison = useMemo(() => {
    if (!prevReport || !currReport) return null;
    return compareHealthReports(prevReport, currReport);
  }, [prevReport, currReport]);

  const matchingResults = useMemo(() => {
    if (!prevReport || !currReport) return [];
    return currReport.results
      .map((curr) => {
        const prev = prevReport.results.find((r) => r.testName === curr.testName);
        if (!prev) return null;
        const diff = parseFloat(curr.value) - parseFloat(prev.value);
        return { testName: curr.testName, prevValue: prev.value, currValue: curr.value, unit: curr.unit, diff, prevStatus: prev.status, currStatus: curr.status };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [prevReport, currReport]);

  const chartData = matchingResults
    .filter((r) => !isNaN(r.diff))
    .map((r) => ({ name: r.testName, Previous: parseFloat(r.prevValue), Current: parseFloat(r.currValue) }));

  const autoSelect = () => {
    if (sortedReports.length >= 2) {
      setPrevId(sortedReports[0].id);
      setCurrId(sortedReports[sortedReports.length - 1].id);
    }
  };

  if (state.reports.length < 2) {
    return (
      <div>
        <PageHeader title="Report Comparison" subtitle="Compare two reports to see changes over time" icon={<GitCompare className="w-5 h-5" />} />
        <Card>
          <EmptyState
            icon={<GitCompare className="w-8 h-8" />}
            title="Not enough reports to compare"
            description="You need at least two uploaded reports to use the comparison feature. Upload your first report to get started."
            action={<Button size="sm" onClick={() => navigate('reports')}>Upload Reports</Button>}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Comparison"
        subtitle="Compare two reports to see actual changes over time"
        icon={<GitCompare className="w-5 h-5" />}
        action={<Button size="sm" variant="outline" onClick={autoSelect}>Auto-select oldest & newest</Button>}
      />

      {/* Selectors */}
      <Card>
        <CardBody>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Previous Report</label>
              <Select value={prevId} onChange={(e) => setPrevId(e.target.value)} options={[{ value: '', label: 'Select a report' }, ...reportOptions]} />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Current Report</label>
              <Select value={currId} onChange={(e) => setCurrId(e.target.value)} options={[{ value: '', label: 'Select a report' }, ...reportOptions]} />
            </div>
          </div>
        </CardBody>
      </Card>

      {prevReport && currReport && (
        <>
          {/* Report headers */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-navy-400 uppercase tracking-wider">Previous</span>
                {prevReport.source === 'demo' && <Badge variant="amber" icon={<Sparkles className="w-3 h-3" />}>Demo</Badge>}
              </div>
              <h3 className="font-semibold text-navy-800">{prevReport.title}</h3>
              <p className="text-sm text-navy-400 mt-1">{formatDate(prevReport.reportDate)}{prevReport.provider ? ` · ${prevReport.provider}` : ''}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-navy-400 uppercase tracking-wider">Current</span>
                {currReport.source === 'demo' && <Badge variant="amber" icon={<Sparkles className="w-3 h-3" />}>Demo</Badge>}
              </div>
              <h3 className="font-semibold text-navy-800">{currReport.title}</h3>
              <p className="text-sm text-navy-400 mt-1">{formatDate(currReport.reportDate)}{currReport.provider ? ` · ${currReport.provider}` : ''}</p>
            </Card>
          </div>

          {/* Comparison table */}
          <Card>
            <CardHeader title="Comparison Results" subtitle="Matching measurements between both reports" icon={<GitCompare className="w-5 h-5" />} />
            <CardBody>
              {matchingResults.length === 0 ? (
                <EmptyState title="No matching measurements" description="These two reports do not share any test names, so a direct comparison is not possible." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2 px-3 font-medium text-navy-400 text-xs uppercase tracking-wider">Test</th>
                        <th className="text-right py-2 px-3 font-medium text-navy-400 text-xs uppercase tracking-wider">Previous</th>
                        <th className="text-right py-2 px-3 font-medium text-navy-400 text-xs uppercase tracking-wider">Current</th>
                        <th className="text-right py-2 px-3 font-medium text-navy-400 text-xs uppercase tracking-wider">Difference</th>
                        <th className="text-center py-2 px-3 font-medium text-navy-400 text-xs uppercase tracking-wider">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchingResults.map((r, i) => {
                        const prevSc = statusColor(r.prevStatus);
                        const currSc = statusColor(r.currStatus);
                        return (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-3 font-medium text-navy-700">{r.testName}</td>
                            <td className="py-3 px-3 text-right text-navy-600">{r.prevValue} <span className="text-xs text-navy-400">{r.unit}</span></td>
                            <td className="py-3 px-3 text-right text-navy-600">{r.currValue} <span className="text-xs text-navy-400">{r.unit}</span></td>
                            <td className="py-3 px-3 text-right font-medium text-navy-700">
                              {isNaN(r.diff) ? 'N/A' : `${r.diff > 0 ? '+' : ''}${r.diff.toFixed(2)} ${r.unit}`}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {r.prevStatus !== r.currStatus ? (
                                  <Badge variant={r.currStatus === 'outside_range' ? 'red' : r.currStatus === 'within_range' ? 'teal' : 'amber'}>
                                    {prevSc.label.split(' ')[0]} → {currSc.label.split(' ')[0]}
                                  </Badge>
                                ) : (
                                  <span className="flex items-center gap-0.5 text-xs text-navy-400">
                                    {isNaN(r.diff) ? <Minus className="w-3 h-3" /> : r.diff > 0 ? <TrendingUp className="w-3 h-3 text-teal-500" /> : r.diff < 0 ? <TrendingDown className="w-3 h-3 text-blue-500" /> : <Minus className="w-3 h-3" />}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Chart */}
          {chartData.length >= 2 && (
            <Card>
              <CardHeader title="Visual Comparison" icon={<GitCompare className="w-5 h-5" />} />
              <CardBody>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-15} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                    <Legend wrapperStyle={{ fontSize: '13px' }} />
                    <Bar dataKey="Previous" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Current" fill="#0d9488" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          )}

          {/* AI Comparison Summary */}
          {comparison && (
            <Card className="bg-gradient-to-br from-teal-50 to-white border-teal-100">
              <CardHeader title="AI Comparison Summary" icon={<Brain className="w-5 h-5" />} />
              <CardBody className="space-y-4">
                <p className="text-sm text-navy-600 leading-relaxed whitespace-pre-line">{comparison.content}</p>
                {comparison.generalInfo && (
                  <div className="pt-3 border-t border-teal-100">
                    <p className="text-xs font-medium text-blue-600 mb-1 flex items-center gap-1"><Info className="w-3 h-3" /> General Information</p>
                    <p className="text-xs text-navy-500 leading-relaxed">{comparison.generalInfo}</p>
                  </div>
                )}
                <div className="pt-3 border-t border-teal-100">
                  <p className="text-xs font-medium text-amber-600 mb-1.5 flex items-center gap-1"><ChevronRight className="w-3 h-3" /> Questions to Discuss With Your Doctor</p>
                  <ul className="space-y-1">
                    {(comparison.suggestedQuestions ?? []).map((q, i) => (
                      <li key={i} className="text-xs text-navy-600 flex items-start gap-1.5">
                        <ChevronRight className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-3 border-t border-teal-100 flex flex-wrap gap-1.5">
                  {comparison.basedOnData.map((s, i) => <Badge key={i} variant="teal">{s}</Badge>)}
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {!prevReport && !currReport && (
        <Card>
          <EmptyState
            icon={<ArrowRight className="w-8 h-8" />}
            title="Select two reports to compare"
            description="Choose a previous and current report above to see a detailed comparison of your results."
          />
        </Card>
      )}
    </div>
  );
}
