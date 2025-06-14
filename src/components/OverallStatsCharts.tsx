import React, { useState, useMemo } from 'react';
import { Pie, Line, Bar, Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler,
  BarElement,
} from 'chart.js';
import { GroupedActivitiesWithStats } from '../types/AppTypes';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler,
  BarElement
);

const formatWeekRangeForChart = (weekStartDate: Date): string => {
  const endDate = new Date(weekStartDate);
  endDate.setDate(weekStartDate.getDate() + 6);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = weekStartDate.toLocaleDateString(undefined, options);
  const endStr = endDate.toLocaleDateString(undefined, options);
  return `${startStr} - ${endStr}`;
};

const formatDurationForTooltip = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0h 0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

interface OverallStatsChartsProps {
  groupedData: GroupedActivitiesWithStats | null;
}

const OverallStatsCharts: React.FC<OverallStatsChartsProps> = ({ groupedData }) => {
  // State for tracking view mode and week range
  const [viewMode, setViewMode] = useState<'weekly' | 'overall'>('weekly');
  const [weekRange, setWeekRange] = useState<number>(4);

  // Filter data based on selected week range - moved before conditional return
  const filteredGroupedData = useMemo(() => {
    if (!groupedData || Object.keys(groupedData).length === 0) return null;
    
    // Sort week keys by date (most recent first)
    const sortedWeekKeys = Object.keys(groupedData).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
    
    // Take only the selected number of weeks (or all if not enough)
    const selectedWeekKeys = sortedWeekKeys.slice(0, weekRange);
    
    // Create a new object with only the selected weeks
    const filteredData: GroupedActivitiesWithStats = {};
    selectedWeekKeys.forEach(key => {
      if (groupedData[key]) {
        filteredData[key] = groupedData[key];
      }
    });
    
    return filteredData;
  }, [groupedData, weekRange]);

  // Early return if no data after the useMemo hook
  if (!filteredGroupedData || Object.keys(filteredGroupedData).length === 0) {
    return <p className="info-text">Not enough activity data to display overall charts.</p>;
  }

  // Calculate Overall Stats for charts based on filtered data
  let totalEasyTime = 0;
  let totalHardTime = 0;
  let totalNaTime = 0;

  Object.values(filteredGroupedData).forEach(week => {
    totalEasyTime += week.easyTime;
    totalHardTime += week.hardTime;
    totalNaTime += week.naTime;
  });
  
  const totalTrackedTimeOverall = totalEasyTime + totalHardTime;
  const easyPercentageOverall = totalTrackedTimeOverall > 0 
    ? Math.round((totalEasyTime / totalTrackedTimeOverall) * 100) 
    : 0;
  const hardPercentageOverall = totalTrackedTimeOverall > 0 
    ? Math.round((totalHardTime / totalTrackedTimeOverall) * 100) 
    : 0;

  // Prepare data for weekly charts
  const sortedWeekKeys = filteredGroupedData ? 
    Object.keys(filteredGroupedData).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()) : 
    [];
    
  const lineChartLabels = sortedWeekKeys.map(weekKey => formatWeekRangeForChart(new Date(weekKey)));
  
  const hardPercentages = sortedWeekKeys.map(weekKey => {
    const week = filteredGroupedData![weekKey];
    return week.totalTrackedTime > 0 ? Math.round((week.hardTime / week.totalTrackedTime) * 100) : 0;
  });

  const easyPercentages = sortedWeekKeys.map(weekKey => {
    const week = filteredGroupedData![weekKey];
    return week.totalTrackedTime > 0 ? Math.round((week.easyTime / week.totalTrackedTime) * 100) : 0;
  });

  // Create pie chart data - used in both views
  const pieChartData = {
    labels: ['Easy Time', 'Hard Time', 'N/A Time'],
    datasets: [
      {
        label: `Time Distribution (Last ${weekRange} Weeks)`,
        data: [totalEasyTime, totalHardTime, totalNaTime].map(time => parseFloat((time / 3600).toFixed(2))),
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(201, 203, 207, 0.6)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(201, 203, 207, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Overall Time Distribution (Hours)',
        font: { size: 16 }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += `${context.parsed.toFixed(2)} hours`;

              let percentage = 0;
              const totalSum = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              if (totalSum > 0) {
                percentage = (context.parsed / totalSum) * 100;
                label += ` (${percentage.toFixed(1)}%)`;
              }
            }
            return label;
          }
        }
      }
    }
  };

  // Weekly view charts data
  const lineChartData = {
    labels: lineChartLabels,
    datasets: [
      {
        label: '% Hard Time',
        data: hardPercentages,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
        yAxisID: 'yPercentage',
      },
      {
        label: '% Easy Time',
        data: easyPercentages,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        yAxisID: 'yPercentage',
      }
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `Weekly Intensity Distribution Trend (Last ${weekRange} Weeks)`,
        font: { size: 16 }
      },
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += `${context.parsed.y}%`;
            }
            
            const weekKey = sortedWeekKeys[context.dataIndex];
            if (weekKey && filteredGroupedData![weekKey]) {
              const weekTotalTime = filteredGroupedData![weekKey].totalTrackedTime;
              label += ` (of ${formatDurationForTooltip(weekTotalTime)})`;
            }
            return label;
          }
        }
      }
    },
    scales: {
      yPercentage: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Percentage of Tracked Time'
        },
        ticks: {
          callback: function(value: any) {
            return value + "%"
          }
        }
      }
    }
  };

  // Weekly Training Volume Chart
  const weeklyTotalHours = sortedWeekKeys.map(weekKey => {
    return parseFloat((filteredGroupedData![weekKey].totalTime / 3600).toFixed(2));
  });
  
  const weeklyEasyHours = sortedWeekKeys.map(weekKey => {
    return parseFloat((filteredGroupedData![weekKey].easyTime / 3600).toFixed(2));
  });
  
  const weeklyHardHours = sortedWeekKeys.map(weekKey => {
    return parseFloat((filteredGroupedData![weekKey].hardTime / 3600).toFixed(2));
  });
  
  const weeklyNaHours = sortedWeekKeys.map(weekKey => {
    return parseFloat((filteredGroupedData![weekKey].naTime / 3600).toFixed(2));
  });

  const volumeChartData = {
    labels: lineChartLabels,
    datasets: [
      {
        label: 'Easy Hours',
        data: weeklyEasyHours,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
        stack: 'Stack 0',
        barPercentage: 0.7,
      },
      {
        label: 'Hard Hours',
        data: weeklyHardHours,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
        stack: 'Stack 0',
        barPercentage: 0.7,
      },
      {
        label: 'N/A Hours',
        data: weeklyNaHours,
        backgroundColor: 'rgba(201, 203, 207, 0.6)',
        borderColor: 'rgba(201, 203, 207, 1)',
        borderWidth: 1,
        stack: 'Stack 0',
        barPercentage: 0.7,
      }
    ]
  };

  const volumeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `Weekly Training Volume (Last ${weekRange} Weeks)`,
        font: { size: 16 }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += `${context.parsed.y.toFixed(2)} hours`;
            }
            return label;
          },
          footer: function(tooltipItems: any) {
            const total = tooltipItems.reduce((sum: number, item: any) => sum + item.parsed.y, 0);
            return `Total: ${total.toFixed(2)} hours`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: 'Week'
        }
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: 'Hours'
        }
      }
    }
  };

  // Weekly Ideal vs Actual Intensity Ratio
  const targetEasyPercentage = 80;
  const targetHardPercentage = 20;

  const weeklyRatioData = {
    labels: lineChartLabels,
    datasets: [
      {
        type: 'line' as const,
        label: 'Target Easy (80%)',
        borderColor: 'rgba(75, 192, 192, 0.7)',
        borderWidth: 2,
        fill: false,
        data: Array(sortedWeekKeys.length).fill(targetEasyPercentage),
        pointRadius: 0,
        borderDash: [5, 5],
      },
      {
        type: 'line' as const,
        label: 'Target Hard (20%)',
        borderColor: 'rgba(255, 99, 132, 0.7)',
        borderWidth: 2,
        fill: false,
        data: Array(sortedWeekKeys.length).fill(targetHardPercentage),
        pointRadius: 0,
        borderDash: [5, 5],
      },
      {
        type: 'bar' as const,
        label: 'Actual Easy %',
        backgroundColor: 'rgba(75, 192, 192, 0.4)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
        data: easyPercentages,
        barPercentage: 0.6,
      },
      {
        type: 'bar' as const,
        label: 'Actual Hard %',
        backgroundColor: 'rgba(255, 99, 132, 0.4)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
        data: hardPercentages,
        barPercentage: 0.6,
      }
    ]
  };

  const weeklyRatioOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `80/20 Target vs Actual (Last ${weekRange} Weeks)`,
        font: { size: 16 }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += `${context.parsed.y}%`;
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Percentage'
        },
        ticks: {
          callback: function(value: any) {
            return value + "%";
          }
        }
      }
    }
  };

  // Overall view charts
  const overallIntensityData = {
    labels: ['Easy', 'Hard'],
    datasets: [
      {
        label: 'Intensity Distribution',
        data: [easyPercentageOverall, hardPercentageOverall],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1,
      },
      {
        label: 'Target Distribution',
        data: [80, 20],
        backgroundColor: [
          'rgba(75, 192, 192, 0.2)',
          'rgba(255, 99, 132, 0.2)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1,
        borderDash: [5, 5]
      }
    ]
  };

  const overallIntensityOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      title: {
        display: true,
        text: `Overall Intensity Distribution vs Target (Last ${weekRange} Weeks)`,
        font: { size: 16 }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.x !== null) {
              label += `${context.parsed.x}%`;
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Percentage'
        },
        ticks: {
          callback: function(value: any) {
            return value + "%";
          }
        }
      }
    }
  };

  // Overall Time Distribution Gauge Chart
  const totalTimeInHours = parseFloat(((totalEasyTime + totalHardTime + totalNaTime) / 3600).toFixed(2));
  const averageWeeklyHours = parseFloat((totalTimeInHours / (sortedWeekKeys.length || 1)).toFixed(2));

  const overallTimeGaugeData = {
    labels: ['Easy', 'Hard', 'N/A'],
    datasets: [
      {
        label: 'Hours',
        data: [
          parseFloat((totalEasyTime / 3600).toFixed(2)), 
          parseFloat((totalHardTime / 3600).toFixed(2)), 
          parseFloat((totalNaTime / 3600).toFixed(2))
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(201, 203, 207, 0.6)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(201, 203, 207, 1)'
        ],
        borderWidth: 1,
      }
    ]
  };

  const overallTimeGaugeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `Total Training Hours: ${totalTimeInHours} (Avg: ${averageWeeklyHours}/week) - Last ${weekRange} Weeks`,
        font: { size: 16 }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed !== null) {
              label += `${context.parsed} hours`;
            }
            return label;
          }
        }
      }
    }
  };

  return (
    <div className="charts-container card-style">
      <h3>Overall Stats</h3>
      {/* Overall goal summary and advice */}
      <div className="overall-goal-summary" style={{ marginBottom: '16px' }}>
        <p>
          <strong>Current Ratio (Easy / Hard):</strong>
          {' '}{easyPercentageOverall}% / {hardPercentageOverall}%
        </p>
        {Math.abs(easyPercentageOverall - targetEasyPercentage) > 10 && (
          <p className="overall-goal-advice" style={{ color: '#d9534f' }}>
            To get closer to the 80/20 goal, aim to keep more workouts in your easy heart-rate zone. 
            This easy heart rate zone is based on your Zone 2 heart rate set in your Strava heart rate zones.
            <br/>
            if you would like to read more about the 80/20 training method, you can read the following article:<br/>
            <a href="https://www.runnersworld.com/uk/training/motivation/a27718661/what-is-80-20-running/" target="_blank" rel="noopener noreferrer"> 
              What is 80/20 running?
            </a>
          </p>
        )}
      </div>
      {/* Chart control container with view toggle and week range selector */}
      <div className="chart-controls-container">
        <div className="view-toggle-container">
          <button 
            className={`view-toggle-btn ${viewMode === 'weekly' ? 'active' : ''}`}
            onClick={() => setViewMode('weekly')}
          >
            Weekly Breakdown
          </button>
          <button 
            className={`view-toggle-btn ${viewMode === 'overall' ? 'active' : ''}`}
            onClick={() => setViewMode('overall')}
          >
            Overall Summary
          </button>
        </div>
        
        <div className="week-range-selector">
          <label htmlFor="week-range">Show data for:</label>
          <select 
            id="week-range" 
            value={weekRange} 
            onChange={(e) => setWeekRange(parseInt(e.target.value, 10))}
          >
            <option value="4">4 weeks</option>
            <option value="5">5 weeks</option>
            <option value="6">6 weeks</option>
            <option value="7">7 weeks</option>
            <option value="8">8 weeks</option>
          </select>
        </div>
      </div>
      
      {/* Always show the pie chart in both views */}
      <div className="chart-wrapper chart-pie-wrapper">
        { (totalEasyTime > 0 || totalHardTime > 0 || totalNaTime > 0) ?
            <Pie data={pieChartData} options={pieOptions} /> :
            <p className="info-text">No time recorded for pie chart.</p>
        }
      </div>
      
      {/* Conditionally render charts based on selected view */}
      {viewMode === 'weekly' ? (
        // Weekly view charts
        <>
          <div className="chart-wrapper chart-line-wrapper">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
          <div className="chart-wrapper">
            <Bar data={volumeChartData} options={volumeChartOptions} />
          </div>
          <div className="chart-wrapper">
            <Chart type="bar" data={weeklyRatioData} options={weeklyRatioOptions} />
          </div>
        </>
      ) : (
        // Overall view charts
        <>
          <div className="chart-wrapper">
            <Bar data={overallIntensityData} options={overallIntensityOptions} />
          </div>
          <div className="chart-wrapper">
            <Bar data={overallTimeGaugeData} options={overallTimeGaugeOptions} />
          </div>
        </>
      )}
    </div>
  );
};

export default OverallStatsCharts;
