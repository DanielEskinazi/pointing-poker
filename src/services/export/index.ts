import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import type { Session, Story, Vote, Player } from '../../types';

export interface SessionData {
  session: Session;
  stories: Story[];
  votes: Record<string, Vote[]>;
  players: Player[];
  statistics: SessionStatistics;
}

export interface SessionStatistics {
  totalStories: number;
  totalPoints: number;
  averagePoints: number;
  consensusRate: number;
  velocityTrend: number;
  timePerStory: number;
  participation: ParticipationStats[];
  distribution: Record<string, number>;
  complexity: Record<string, number>;
  velocityHistory: VelocityPoint[];
}

export interface ParticipationStats {
  playerId: string;
  playerName: string;
  votesCount: number;
  participationRate: number;
  averageVote: number;
}

export interface VelocityPoint {
  date: string;
  velocity: number;
  storiesCompleted: number;
}

export class ExportService {
  /**
   * Export session data to CSV format
   */
  async exportToCSV(sessionData: SessionData): Promise<void> {
    const csv = this.generateCSV(sessionData);
    this.downloadFile(csv, `planning-poker-${sessionData.session.id}.csv`, 'text/csv');
  }

  /**
   * Export session data to JSON format
   */
  async exportToJSON(sessionData: SessionData): Promise<void> {
    const json = JSON.stringify(this.formatSessionData(sessionData), null, 2);
    this.downloadFile(json, `planning-poker-${sessionData.session.id}.json`, 'application/json');
  }

  /**
   * Export session data to PDF report
   */
  async exportToPDF(sessionData: SessionData): Promise<void> {
    const pdf = await this.generatePDF(sessionData);
    this.downloadFile(pdf, `planning-poker-${sessionData.session.id}.pdf`, 'application/pdf');
  }

  /**
   * Copy session data to clipboard in a formatted way
   */
  async copyToClipboard(sessionData: SessionData): Promise<void> {
    const formattedData = this.formatForClipboard(sessionData);
    
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(formattedData);
    } else {
      // Fallback for non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = formattedData;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }
  }

  private generateCSV(sessionData: SessionData): string {
    const { session, stories, votes, statistics } = sessionData;
    
    // Create main stories data
    const storiesData = stories.map(story => {
      const storyVotes = votes[story.id] || [];
      const consensus = this.calculateStoryConsensus(storyVotes);
      
      return {
        'Story Title': story.title,
        'Description': story.description || '',
        'Final Estimate': story.finalEstimate || 'N/A',
        'Consensus': consensus.hasConsensus ? 'Yes' : 'No',
        'Suggested Value': consensus.suggestedValue || 'N/A',
        'Vote Count': storyVotes.length,
        'Votes': storyVotes.map(v => v.value).join(', '),
        'Average': consensus.averageValue?.toFixed(1) || 'N/A',
        'Created At': new Date(story.createdAt).toLocaleString(),
        'Completed At': story.completedAt ? new Date(story.completedAt).toLocaleString() : 'N/A'
      };
    });

    // Add session summary at the top
    const summaryData = [
      ['Session Summary', ''],
      ['Session ID', session.id],
      ['Session Name', session.name],
      ['Created At', new Date(session.createdAt).toLocaleString()],
      ['Total Stories', statistics.totalStories.toString()],
      ['Total Points', statistics.totalPoints.toString()],
      ['Average Points', statistics.averagePoints.toFixed(1)],
      ['Consensus Rate', `${statistics.consensusRate.toFixed(0)}%`],
      ['', ''], // Empty row separator
      ['Stories Detail', '']
    ];

    const summaryCSV = summaryData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const storiesCSV = Papa.unparse(storiesData);
    
    return summaryCSV + '\n' + storiesCSV;
  }

  private async generatePDF(sessionData: SessionData): Promise<Blob> {
    const { session, stories, statistics } = sessionData;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Planning Poker Session Report', 20, 20);
    
    // Session info
    doc.setFontSize(12);
    doc.text(`Session ID: ${session.id}`, 20, 40);
    doc.text(`Session Name: ${session.name}`, 20, 50);
    doc.text(`Date: ${new Date(session.createdAt).toLocaleDateString()}`, 20, 60);
    doc.text(`Total Stories: ${stories.length}`, 20, 70);
    
    // Statistics summary
    doc.setFontSize(14);
    doc.text('Summary Statistics:', 20, 90);
    doc.setFontSize(12);
    doc.text(`• Total Points: ${statistics.totalPoints}`, 30, 105);
    doc.text(`• Average Points: ${statistics.averagePoints.toFixed(1)}`, 30, 115);
    doc.text(`• Consensus Rate: ${statistics.consensusRate.toFixed(0)}%`, 30, 125);
    doc.text(`• Time per Story: ${this.formatDuration(statistics.timePerStory)}`, 30, 135);
    
    // Stories table
    const tableData = stories.map(story => [
      story.title,
      story.description || '',
      story.finalEstimate || 'N/A',
      new Date(story.createdAt).toLocaleDateString()
    ]);

    autoTable(doc, {
      head: [['Story Title', 'Description', 'Final Estimate', 'Created']],
      body: tableData,
      startY: 150,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 80 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 }
      }
    });

    // Add participation stats on new page if there's data
    if (statistics.participation.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Player Participation:', 20, 20);
      
      const participationData = statistics.participation.map(p => [
        p.playerName,
        p.votesCount.toString(),
        `${p.participationRate.toFixed(0)}%`,
        p.averageVote.toFixed(1)
      ]);

      autoTable(doc, {
        head: [['Player', 'Votes Cast', 'Participation Rate', 'Average Vote']],
        body: participationData,
        startY: 30,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [66, 139, 202] }
      });
    }
    
    return doc.output('blob');
  }

  private formatSessionData(sessionData: SessionData) {
    const { session, stories, votes, statistics } = sessionData;
    
    return {
      session: {
        id: session.id,
        name: session.name,
        createdAt: session.createdAt,
        config: session.config
      },
      statistics,
      stories: stories.map(story => ({
        ...story,
        votes: votes[story.id] || [],
        consensus: this.calculateStoryConsensus(votes[story.id] || [])
      })),
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
    };
  }

  private formatForClipboard(sessionData: SessionData): string {
    const { session, stories, statistics } = sessionData;
    
    let output = `# Planning Poker Session Report\n\n`;
    output += `**Session:** ${session.name}\n`;
    output += `**Date:** ${new Date(session.createdAt).toLocaleDateString()}\n`;
    output += `**Stories:** ${stories.length}\n\n`;
    
    output += `## Summary Statistics\n`;
    output += `- Total Points: ${statistics.totalPoints}\n`;
    output += `- Average Points: ${statistics.averagePoints.toFixed(1)}\n`;
    output += `- Consensus Rate: ${statistics.consensusRate.toFixed(0)}%\n\n`;
    
    output += `## Stories\n`;
    stories.forEach((story, index) => {
      output += `${index + 1}. **${story.title}**\n`;
      if (story.description) {
        output += `   ${story.description}\n`;
      }
      output += `   Final Estimate: ${story.finalEstimate || 'Not estimated'}\n\n`;
    });
    
    return output;
  }

  private calculateStoryConsensus(votes: Vote[]) {
    if (votes.length === 0) {
      return { hasConsensus: false };
    }

    const numericVotes = votes
      .map(v => v.value)
      .filter(v => typeof v === 'number') as number[];

    if (numericVotes.length === 0) {
      return { hasConsensus: false };
    }

    // Calculate statistics
    const average = numericVotes.reduce((sum, val) => sum + val, 0) / numericVotes.length;
    const sorted = [...numericVotes].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    // Check for consensus (80% agreement within 1 point of median)
    const tolerance = 1;
    const consensusVotes = numericVotes.filter(v => Math.abs(v - median) <= tolerance);
    const consensusPercentage = consensusVotes.length / numericVotes.length;
    
    const hasConsensus = consensusPercentage >= 0.8;
    const deviation = Math.sqrt(
      numericVotes.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / numericVotes.length
    );

    return {
      hasConsensus,
      suggestedValue: hasConsensus ? median : undefined,
      averageValue: average,
      deviation,
    };
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.round((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  private downloadFile(content: string | Blob, filename: string, mimeType: string): void {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

export const exportService = new ExportService();