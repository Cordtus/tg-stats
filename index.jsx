import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { analyzeChatLog, aggregateMetrics } from './server.jsx';
import './index.css';
import DarkModeToggle from './darkMode.jsx';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c'];

const CollapsibleSection = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg mb-4">
    <button
    onClick={() => setIsOpen(!isOpen)}
    className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg"
    >
    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{title}</h3>
    <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
    </button>
    {isOpen && (
      <div className="px-4 pb-4">
      {children}
      </div>
    )}
    </div>
  );
};

const StatsCard = ({ title, value, subtitle }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-lg hover:shadow-md dark:hover:shadow-xl transition-shadow">
  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
  <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
  {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">{subtitle}</p>}
  </div>
);

const ScrollableList = ({ items, renderItem, maxHeight = "96" }) => (
  <div className={`overflow-y-auto max-h-${maxHeight} pr-2`}>
  {items.map((item, index) => renderItem(item, index))}
  </div>
);

const SortableList = ({ items, renderItem, sortOptions, defaultSort }) => {
  const [sortKey, setSortKey] = useState(defaultSort);
  const [sortDirection, setSortDirection] = useState('desc');

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    const aValue = sortKey === 'name' ? a[0] : a[1];
    const bValue = sortKey === 'name' ? b[0] : b[1];
    return sortDirection === 'asc'
    ? aValue > bValue ? 1 : -1
    : aValue < bValue ? 1 : -1;
  });

  return (
    <div>
    <div className="flex space-x-4 mb-4">
    {sortOptions.map(option => (
      <button
      key={option.key}
      onClick={() => toggleSort(option.key)}
      className={`px-3 py-1 rounded text-sm ${
        sortKey === option.key
        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
        : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100'
      }`}
      >
      {option.label}
      {sortKey === option.key && (
        <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
        </span>
      )}
      </button>
    ))}
    </div>
    <ScrollableList items={sortedItems} renderItem={renderItem} />
    </div>
  );
};

const ChatDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Enhanced date range state
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [dateRange, setDateRange] = useState({
    minDate: null,
    maxDate: null
  });

  useEffect(() => {
    const analyzeFiles = async () => {
      if (selectedFiles.length === 0) {
        setMetrics(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const filePromises = selectedFiles.map(async file => {
          const content = await file.text();
          return content;
        });

        const fileContents = await Promise.all(filePromises);
        const results = await aggregateMetrics(fileContents);
        setMetrics(results);

        // Find the absolute minimum and maximum dates
        const allDates = Object.keys(results.messagesByDate);
        const absoluteMinDate = new Date(Math.min(...allDates.map(date => new Date(date))));
        const absoluteMaxDate = new Date(Math.max(...allDates.map(date => new Date(date))));

        // Update date range state
        setDateRange({
          minDate: absoluteMinDate,
          maxDate: absoluteMaxDate
        });

        // Set initial date range to full range
        setStartDate(absoluteMinDate);
        setEndDate(absoluteMaxDate);
      } catch (err) {
        setError(err.message);
        console.error('Error analyzing chats:', err);
      } finally {
        setLoading(false);
      }
    };

    analyzeFiles();
  }, [selectedFiles]);

  const handleFileSelect = async (event) => {
    setSelectedFiles(Array.from(event.target.files));
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'activity', label: 'Activity' },
    { id: 'users', label: 'Users' },
    { id: 'content', label: 'Content' }
  ];

  // If no metrics, show file upload screen
  // If no metrics, show file upload screen
  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">Chat Log Analysis</h1>
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center">
      <div className="w-20 h-20 mb-4">
      <svg
      className="w-full h-full text-gray-400 dark:text-gray-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      >
      <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
      </svg>
      </div>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
      Click to select files or drag and drop
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
      HTML files only
      </p>
      <input
      type="file"
      multiple
      accept=".html"
      onChange={handleFileSelect}
      className="hidden"
      id="file-upload"
      />
      <label
      htmlFor="file-upload"
      className="bg-indigo-600 text-white px-4 py-2 rounded-md
      hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600
      cursor-pointer transition-colors duration-200"
      >
      Select Files
      </label>
      {selectedFiles.length > 0 && (
        <div className="mt-8 w-full">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
        Selected Files ({selectedFiles.length}):
        </h3>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        {Array.from(selectedFiles).map((file, index) => (
          <div
          key={index}
          className="flex items-center py-2 border-b dark:border-gray-600 last:border-0"
          >
          <svg
          className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          >
          <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
          </svg>
          <span className="text-sm text-gray-600 dark:text-gray-300">{file.name}</span>
          </div>
        ))}
        </div>
        </div>
      )}
      </div>
      </div>
      </div>
      </div>
    );
  }

  // If loading, show loading screen
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-xl text-gray-600 dark:text-gray-400">Analyzing chat logs...</div>
      </div>
    );
  }

  // If error, show error screen
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded max-w-lg">
      <h3 className="font-medium mb-2">Error Analyzing Chats</h3>
      <p>{error}</p>
      </div>
      </div>
    );
  }

  // Prepare data for charts
  const hourlyData = Object.entries(metrics.messagesByHour)
  .map(([hour, count]) => ({
    hour: parseInt(hour),
                           messages: count
  }))
  .sort((a, b) => a.hour - b.hour);

  const weeklyData = Object.entries(metrics.messagesByDayOfWeek)
  .map(([day, count]) => ({
    day,
    messages: count
  }));

  const dailyData = Object.entries(metrics.messagesByDate)
  .map(([date, count]) => ({
    date,
    messages: count
  }))
  .sort((a, b) => a.date.localeCompare(b.date));

  // Filter daily data based on selected range
  const filteredDailyData = dailyData.filter(({ date }) => {
    const messageDate = new Date(date);
    return (!startDate || messageDate >= startDate) && (!endDate || messageDate <= endDate);
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 pb-12">
    {/* Sticky header with file upload and tabs */}
    <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow dark:shadow-lg">
    {/* Existing header content with dark mode classes */}
    </div>

    {/* Date range picker */}
    <div className="max-w-7xl mx-auto px-4 py-4">
    <div className="flex space-x-4 mb-4">
    <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
    <DatePicker
    selected={startDate}
    onChange={(date) => setStartDate(date)}
    selectsStart
    startDate={startDate}
    endDate={endDate}
    minDate={dateRange.minDate}
    maxDate={dateRange.maxDate}
    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
    focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400
    focus:border-indigo-500 dark:focus:border-indigo-400
    sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
    />
    </div>
    <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
    <DatePicker
    selected={endDate}
    onChange={(date) => setEndDate(date)}
    selectsEnd
    startDate={startDate}
    endDate={endDate}
    minDate={startDate || dateRange.minDate}
    maxDate={dateRange.maxDate}
    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
    focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400
    focus:border-indigo-500 dark:focus:border-indigo-400
    sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
    />
    </div>
    </div>
    </div>

    {/* Main content area with tabs */}
    <main className="max-w-7xl mx-auto px-4 py-6">
    {/* Overview Tab */}
    {activeTab === 'overview' && (
      <div className="space-y-6">
      {/* StatsCards already handled */}
      <CollapsibleSection title="Daily Activity">
      <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
      <LineChart
      data={filteredDailyData}
      className="dark:bg-gray-800"
      >
      <CartesianGrid
      stroke="#4a5568"
      strokeDasharray="3 3"
      />
      <XAxis
      dataKey="date"
      stroke="#718096"
      tick={{fill: '#718096'}}
      />
      <YAxis
      stroke="#718096"
      tick={{fill: '#718096'}}
      />
      <Tooltip
      contentStyle={{
        backgroundColor: '#2d3748',
        color: '#e2e8f0'
      }}
      />
      <Legend
      wrapperStyle={{
        color: '#718096'
      }}
      />
      <Line
      type="monotone"
      dataKey="messages"
      stroke="#8884d8"
      strokeWidth={2}
      />
      </LineChart>
      </ResponsiveContainer>
      </div>
      </CollapsibleSection>

      {/* Existing Message Distribution by Hour section */}
      <CollapsibleSection title="Message Distribution by Hour">
      <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
      <BarChart
      data={hourlyData}
      className="dark:bg-gray-800"
      >
      <CartesianGrid
      stroke="#4a5568"
      strokeDasharray="3 3"
      />
      <XAxis
      dataKey="hour"
      stroke="#718096"
      tick={{fill: '#718096'}}
      />
      <YAxis
      stroke="#718096"
      tick={{fill: '#718096'}}
      />
      <Tooltip
      contentStyle={{
        backgroundColor: '#2d3748',
        color: '#e2e8f0'
      }}
      />
      <Legend
      wrapperStyle={{
        color: '#718096'
      }}
      />
      <Bar
      dataKey="messages"
      fill="#82ca9d"
      radius={[4, 4, 0, 0]}
      />
      </BarChart>
      </ResponsiveContainer>
      </div>
      </CollapsibleSection>
      </div>
    )}

    {/* Activity Tab */}
    {activeTab === 'activity' && (
      <div className="space-y-6">
      <CollapsibleSection title="Activity by Day of Week">
      <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
      <BarChart
      data={weeklyData}
      className="dark:bg-gray-800"
      >
      <CartesianGrid
      stroke="#4a5568"
      strokeDasharray="3 3"
      />
      <XAxis
      dataKey="day"
      stroke="#718096"
      tick={{fill: '#718096'}}
      />
      <YAxis
      stroke="#718096"
      tick={{fill: '#718096'}}
      />
      <Tooltip
      contentStyle={{
        backgroundColor: '#2d3748',
        color: '#e2e8f0'
      }}
      />
      <Legend
      wrapperStyle={{
        color: '#718096'
      }}
      />
      <Bar
      dataKey="messages"
      fill="#8884d8"
      radius={[4, 4, 0, 0]}
      />
      </BarChart>
      </ResponsiveContainer>
      </div>
      </CollapsibleSection>

      <CollapsibleSection title="User Categories">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.userTypes.map(type => (
        <div key={type} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <p className="font-medium text-gray-900 dark:text-gray-100">{type}</p>
        </div>
      ))}
      </div>
      </CollapsibleSection>
      </div>
    )}

    {/* Users Tab */}
    {activeTab === 'users' && (
      <div className="space-y-6">
      {/* Most Active Users, Most Reacted To, Most Mentioned Users */}
      {['Most Active Users', 'Most Reacted To', 'Most Mentioned Users'].map((title, index) => (
        <CollapsibleSection key={title} title={title}>
        <SortableList
        items={
          index === 0 ? metrics.mostActiveUsers.map(({ user, count }) => [user, count]) :
          index === 1 ? metrics.mostReactedTo.map(({ user, count }) => [user, count]) :
          metrics.topMentions
        }
        sortOptions={[
          { key: 'name', label: 'Username' },
          { key: 'count', label: index === 0 ? 'Message Count' : index === 1 ? 'Reactions' : 'Mentions' },
        ]}
        defaultSort="count"
        renderItem={([item, count], index) => (
          <div
          key={item}
          className="flex items-center justify-between py-2 border-b dark:border-gray-600 last:border-0"
          >
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {index + 1}. {item}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
          {count} {index === 0 ? 'messages' : index === 1 ? 'reactions' : 'mentions'}
          </span>
          </div>
        )}
        />
        </CollapsibleSection>
      ))}
      </div>
    )}

{/* Content Tab */}
{activeTab === 'content' && (
  <div className="space-y-6">
    <CollapsibleSection title="Most Used Words">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.topWords.slice(0, 20).map(([word, count]) => (
          <div
            key={word}
            className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <p className="font-medium text-gray-900 dark:text-gray-100">{word}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{count} occurrences</p>
          </div>
        ))}
      </div>
    </CollapsibleSection>

    <CollapsibleSection title="Shared Links">
            <ScrollableList
              items={metrics.uniqueLinks}
              maxHeight="64"
              renderItem={(link) => (
                <div
                  key={link}
                  className="p-2 bg-gray-50 dark:bg-gray-700 rounded mb-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 break-all"
                  >
                    {link}
                  </a>
                </div>
              )}
            />
          </CollapsibleSection>
        </div>
      )}
    </main> 
  </div>
);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChatDashboard />
  </React.StrictMode>
);

export default ChatDashboard;