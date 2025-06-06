import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  TrendingUp, 
  BarChart3, 
  Users, 
  Clock, 
  FileText,
  Copy,
  CheckCircle
} from 'lucide-react';
import { useGameStore } from '../store';
import { exportService } from '../services/export';
import { statisticsCalculator } from '../services/statistics/calculator';
import { VoteDistributionChart, VelocityTrendChart, ComplexityPieChart } from './charts';
import type { SessionData } from '../services/export';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  color?: 'green' | 'yellow' | 'red' | 'blue';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color = 'blue' }) => {
  const colorClasses = {
    green: 'from-green-50 to-emerald-50 border-green-200',
    yellow: 'from-yellow-50 to-orange-50 border-yellow-200',
    red: 'from-red-50 to-pink-50 border-red-200',
    blue: 'from-blue-50 to-indigo-50 border-blue-200'
  };

  const iconColorClasses = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    blue: 'text-blue-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-lg p-4 border`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`${iconColorClasses[color]} p-2 rounded-lg bg-white/50`}>
            {icon}
          </div>
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
        {trend !== undefined && (
          <div className={`text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '↗' : '↘'} {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface ParticipationTableProps {
  participation: Array<{
    playerId: string;
    playerName: string;
    votesCount: number;
    participationRate: number;
    averageVote: number;
  }>;
}

const ParticipationTable: React.FC<ParticipationTableProps> = ({ participation }) => {
  if (participation.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-500">No participation data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h4 className="text-lg font-semibold text-gray-800">Player Participation</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Player
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Votes Cast
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Participation Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Average Vote
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {participation.map((player) => (
              <tr key={player.playerId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{player.playerName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{player.votesCount}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm text-gray-900">{player.participationRate.toFixed(0)}%</div>
                    <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.min(player.participationRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {player.averageVote > 0 ? player.averageVote.toFixed(1) : 'N/A'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const SessionStatistics: React.FC = () => {
  const { sessionId, stories, players, voting } = useGameStore();
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar');
  const [isExporting, setIsExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Calculate session statistics
  const statistics = useMemo(() => {
    if (!sessionId || stories.length === 0) return null;

    // Mock session data - in a real app this would come from API
    const mockSession = {
      id: sessionId,
      name: `Session ${sessionId.slice(-6)}`,
      hostId: '',
      config: {
        cardValues: ['1', '2', '3', '5', '8', '13', '?', 'coffee'],
        allowSpectators: true,
        autoRevealCards: false,
        timerSeconds: 300
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    };

    // Mock votes data - in a real app this would come from API
    const votesData: Record<string, any[]> = {};
    stories.forEach(story => {
      if (voting.votingResults.length > 0) {
        votesData[story.id] = voting.votingResults.map(result => ({
          ...result,
          storyId: story.id
        }));
      }
    });

    return statisticsCalculator.calculateSessionStats(
      mockSession,
      stories,
      votesData,
      players
    );
  }, [sessionId, stories, players, voting]);

  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    if (!statistics || !sessionId) return;

    setIsExporting(true);
    try {
      const sessionData: SessionData = {
        session: {
          id: sessionId,
          name: `Session ${sessionId.slice(-6)}`,
          hostId: '',
          config: {
            cardValues: ['1', '2', '3', '5', '8', '13', '?', 'coffee'],
            allowSpectators: true,
            autoRevealCards: false,
            timerSeconds: 300
          },
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        },
        stories,
        votes: {},
        players,
        statistics
      };

      switch (format) {
        case 'csv':
          await exportService.exportToCSV(sessionData);
          break;
        case 'json':
          await exportService.exportToJSON(sessionData);
          break;
        case 'pdf':
          await exportService.exportToPDF(sessionData);
          break;
      }
    } catch (error) {
      console.error(`Export failed:`, error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!statistics || !sessionId) return;

    try {
      const sessionData: SessionData = {
        session: {
          id: sessionId,
          name: `Session ${sessionId.slice(-6)}`,
          hostId: '',
          config: {
            cardValues: ['1', '2', '3', '5', '8', '13', '?', 'coffee'],
            allowSpectators: true,
            autoRevealCards: false,
            timerSeconds: 300
          },
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        },
        stories,
        votes: {},
        players,
        statistics
      };

      await exportService.copyToClipboard(sessionData);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
    }
  };

  if (!statistics) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Statistics Available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Complete some stories to see session statistics and export options.
          </p>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Session Statistics</h3>
            <p className="text-gray-600">
              {statistics.totalStories} {statistics.totalStories === 1 ? 'story' : 'stories'} analyzed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              JSON
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              PDF Report
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {copySuccess ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copySuccess ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Points"
            value={statistics.totalPoints}
            icon={<TrendingUp className="h-5 w-5" />}
            trend={statistics.velocityTrend}
          />
          
          <StatCard
            title="Average Points"
            value={statistics.averagePoints.toFixed(1)}
            icon={<BarChart3 className="h-5 w-5" />}
          />
          
          <StatCard
            title="Consensus Rate"
            value={`${statistics.consensusRate.toFixed(0)}%`}
            icon={<Users className="h-5 w-5" />}
            color={statistics.consensusRate > 70 ? 'green' : statistics.consensusRate > 40 ? 'yellow' : 'red'}
          />
          
          <StatCard
            title="Time per Story"
            value={formatDuration(statistics.timePerStory)}
            icon={<Clock className="h-5 w-5" />}
          />
        </div>

        {/* Charts Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">Visual Analytics</h4>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  chartType === 'bar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setChartType('bar')}
              >
                Bar Chart
              </button>
              <button
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  chartType === 'pie' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setChartType('pie')}
              >
                Pie Chart
              </button>
              <button
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  chartType === 'line' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setChartType('line')}
              >
                Trend Line
              </button>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            {chartType === 'bar' && <VoteDistributionChart data={statistics.distribution} />}
            {chartType === 'pie' && <ComplexityPieChart data={statistics.complexity} />}
            {chartType === 'line' && <VelocityTrendChart data={statistics.velocityHistory} />}
          </div>
        </div>

        {/* Participation Table */}
        <ParticipationTable participation={statistics.participation} />
      </div>
    </motion.div>
  );
};