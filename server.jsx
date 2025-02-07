// Chat analysis functions
export async function analyzeChatLog(content) {
  function parseDate(dateStr) {
    // Handle Telegram date format: "DD.MM.YYYY HH:mm:ss UTC-07:00"
    const [datePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('.');
    return new Date(`${year}-${month}-${day}`);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');

  // Get all messages
  const messages = Array.from(doc.querySelectorAll('.message'));
  const userMessages = messages.filter(msg => msg.classList.contains('default'));
  const serviceMessages = messages.filter(msg => msg.classList.contains('service'));

  // Extract users and their message counts
  const userCounts = {};
  const reactionCounts = {};
  const userMessagesByDate = {};
  const userTypes = new Set();

  userMessages.forEach(msg => {
    const nameElem = msg.querySelector('.from_name');
    const dateElem = msg.querySelector('.date.details');

    if (nameElem) {
      const name = nameElem.textContent.trim();
      userCounts[name] = (userCounts[name] || 0) + 1;

      // Track reactions received
      const reactions = msg.querySelectorAll('.reaction');
      if (reactions.length > 0) {
        reactionCounts[name] = (reactionCounts[name] || 0) + reactions.length;
      }

      // Track message dates for user activity
      if (dateElem) {
        const fullDate = dateElem.getAttribute('title');
        if (fullDate) {
          try {
            const date = parseDate(fullDate);
            const dateStr = date.toISOString().split('T')[0];
            if (!userMessagesByDate[name]) {
              userMessagesByDate[name] = {};
            }
            userMessagesByDate[name][dateStr] = (userMessagesByDate[name][dateStr] || 0) + 1;
          } catch (e) {
            console.warn('Error parsing user message date:', fullDate);
          }
        }
      }

      // Track user types (if they have special markers in name)
      if (name.includes('|')) userTypes.add('Team Member');
      if (name.includes('admin')) userTypes.add('Admin');
      if (name.includes('mod')) userTypes.add('Moderator');
    }
  });

  // Get message times distribution
  const hourCounts = {};
  const dayOfWeekCounts = {};
  const messagesByDate = {};

  messages.forEach(msg => {
    const timeElem = msg.querySelector('.date.details');
    if (timeElem) {
      const fullDate = timeElem.getAttribute('title');
      if (fullDate) {
        try {
          // Extract hour from the display time
          const timeText = timeElem.textContent.trim();
          if (timeText.includes(':')) {
            const hour = parseInt(timeText.split(':')[0]);
            if (!isNaN(hour)) {
              hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            }
          }

          // Parse the full date
          const date = parseDate(fullDate);
          const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
          dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;

          const dateStr = date.toISOString().split('T')[0];
          messagesByDate[dateStr] = (messagesByDate[dateStr] || 0) + 1;
        } catch (e) {
          console.warn('Error parsing message date:', fullDate);
        }
      }
    }
  });

  // Get unique dates
  const dates = new Set();
  messages.forEach(msg => {
    const dateElem = msg.querySelector('.body.details');
    if (dateElem && dateElem.textContent.includes('2024')) {
      const dateText = dateElem.textContent.trim();
      if (!dateText.includes(':')) {
        dates.add(dateText);
      }
    }
  });

  // Analyze message content
  const messageLengths = [];
  const wordFrequency = {};
  const mentions = {};
  const links = new Set();

  userMessages.forEach(msg => {
    const textElem = msg.querySelector('.text');
    if (textElem) {
      const text = textElem.textContent.trim();

      // Message length
      messageLengths.push(text.length);

      // Word frequency
      const words = text.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) { // Skip short words
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
      });

      // Track mentions
      const mentionMatches = text.match(/@[\w]+/g);
      if (mentionMatches) {
        mentionMatches.forEach(mention => {
          mentions[mention] = (mentions[mention] || 0) + 1;
        });
      }

      // Track links
      const linkElems = msg.querySelectorAll('a');
      linkElems.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('@')) {
          links.add(href);
        }
      });
    }
  });

  // Calculate reply chains
  const replyChains = {};
  userMessages.forEach(msg => {
    const replyElem = msg.querySelector('.reply_to');
    if (replyElem) {
      const replyId = replyElem.querySelector('a')?.getAttribute('onclick')?.match(/\d+/)?.[0];
      if (replyId) {
        replyChains[replyId] = (replyChains[replyId] || 0) + 1;
      }
    }
  });

  const avgMessageLength = messageLengths.length > 0
  ? Math.round(messageLengths.reduce((a, b) => a + b, 0) / messageLengths.length)
  : 0;

  return {
    totalMessages: messages.length,
    userMessages: userMessages.length,
    serviceMessages: serviceMessages.length,
    uniqueUsers: Object.keys(userCounts).length,
    messagesByUser: userCounts,
    messagesByHour: hourCounts,
    messagesByDayOfWeek: dayOfWeekCounts,
    messagesByDate,
    userMessagesByDate,
    reactionsByUser: reactionCounts,
    datesCovered: Array.from(dates).sort(),
    averageMessageLength: avgMessageLength,
    messageLengthDistribution: messageLengths,
    topWords: Object.entries(wordFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 50),
    topMentions: Object.entries(mentions)
    .sort(([,a], [,b]) => b - a),
    uniqueLinks: Array.from(links),
    userTypes: Array.from(userTypes),
    longestThreads: Object.entries(replyChains)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
  };
}

export async function aggregateMetrics(fileContents) {
  const aggregated = {
    totalMessages: 0,
    userMessages: 0,
    serviceMessages: 0,
    uniqueUsers: new Set(),
    messagesByUser: {},
    messagesByHour: {},
    messagesByDayOfWeek: {},
    messagesByDate: {},
    reactionsByUser: {},
    datesCovered: new Set(),
    messageLengths: [],
    wordFrequency: {},
    mentions: {},
    links: new Set(),
    userTypes: new Set(),
    replyChains: {}
  };

  for (const content of fileContents) {
    try {
      const metrics = await analyzeChatLog(content);

      // Aggregate basic counts
      aggregated.totalMessages += metrics.totalMessages;
      aggregated.userMessages += metrics.userMessages;
      aggregated.serviceMessages += metrics.serviceMessages;

      // Combine user data
      Object.entries(metrics.messagesByUser).forEach(([user, count]) => {
        aggregated.uniqueUsers.add(user);
        aggregated.messagesByUser[user] = (aggregated.messagesByUser[user] || 0) + count;
      });

      // Combine time distributions
      Object.entries(metrics.messagesByHour).forEach(([hour, count]) => {
        aggregated.messagesByHour[hour] = (aggregated.messagesByHour[hour] || 0) + count;
      });

      Object.entries(metrics.messagesByDayOfWeek).forEach(([day, count]) => {
        aggregated.messagesByDayOfWeek[day] = (aggregated.messagesByDayOfWeek[day] || 0) + count;
      });

      Object.entries(metrics.messagesByDate).forEach(([date, count]) => {
        aggregated.messagesByDate[date] = (aggregated.messagesByDate[date] || 0) + count;
      });

      // Combine reactions
      Object.entries(metrics.reactionsByUser).forEach(([user, count]) => {
        aggregated.reactionsByUser[user] = (aggregated.reactionsByUser[user] || 0) + count;
      });

      // Add dates
      metrics.datesCovered.forEach(date => aggregated.datesCovered.add(date));

      // Combine message lengths
      aggregated.messageLengths.push(...metrics.messageLengthDistribution);

      // Combine word frequencies
      metrics.topWords.forEach(([word, count]) => {
        aggregated.wordFrequency[word] = (aggregated.wordFrequency[word] || 0) + count;
      });

      // Combine mentions
      metrics.topMentions.forEach(([mention, count]) => {
        aggregated.mentions[mention] = (aggregated.mentions[mention] || 0) + count;
      });

      // Combine links and user types
      metrics.uniqueLinks.forEach(link => aggregated.links.add(link));
      metrics.userTypes.forEach(type => aggregated.userTypes.add(type));
    } catch (error) {
      console.error(`Error processing file content:`, error);
    }
  }

  const avgMessageLength = aggregated.messageLengths.length > 0
  ? Math.round(aggregated.messageLengths.reduce((a, b) => a + b, 0) / aggregated.messageLengths.length)
  : 0;

  return {
    totalMessages: aggregated.totalMessages,
    userMessages: aggregated.userMessages,
    serviceMessages: aggregated.serviceMessages,
    uniqueUsers: aggregated.uniqueUsers.size,
    messagesByUser: aggregated.messagesByUser,
    messagesByHour: aggregated.messagesByHour,
    messagesByDayOfWeek: aggregated.messagesByDayOfWeek,
    messagesByDate: aggregated.messagesByDate,
    reactionsByUser: aggregated.reactionsByUser,
    datesCovered: Array.from(aggregated.datesCovered).sort(),
    averageMessageLength: avgMessageLength,
    topWords: Object.entries(aggregated.wordFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 50),
    topMentions: Object.entries(aggregated.mentions)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20),
    uniqueLinks: Array.from(aggregated.links),
    userTypes: Array.from(aggregated.userTypes),
    mostActiveUsers: Object.entries(aggregated.messagesByUser)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([user, count]) => ({ user, count })),
    mostReactedTo: Object.entries(aggregated.reactionsByUser)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([user, count]) => ({ user, count }))
  };
}
