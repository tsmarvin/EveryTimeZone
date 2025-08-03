/**
 * Script to analyze available timezones and identify missing offset ranges
 * This addresses issue #118 - Missing Timezones like -12 UTC
 */

// No need for Temporal polyfill for basic Intl analysis

/**
 * Analyze all supported timezones and their offsets
 */
function analyzeTimezones() {
  console.log('Analyzing timezone coverage...\n');
  
  // Get all supported timezones
  const allTimezones = Intl.supportedValuesOf('timeZone');
  console.log(`Total supported timezones: ${allTimezones.length}`);
  
  const now = new Date();
  const timezoneData = new Map();
  const offsetStats = new Map();
  
  // Analyze each timezone
  allTimezones.forEach(iana => {
    try {
      const formatter = new Intl.DateTimeFormat('en', {
        timeZone: iana,
        timeZoneName: 'longOffset',
      });
      
      const offsetStr = formatter.formatToParts(now).find(part => part.type === 'timeZoneName')?.value || '+00:00';
      
      // Parse offset string like "GMT+05:30" or "GMT-08:00"
      const offsetMatch = offsetStr.match(/GMT([+-])(\d{2}):(\d{2})/);
      let offset = 0;
      if (offsetMatch && offsetMatch[2] && offsetMatch[3]) {
        const sign = offsetMatch[1] === '+' ? 1 : -1;
        const hours = parseInt(offsetMatch[2], 10);
        const minutes = parseInt(offsetMatch[3], 10);
        offset = sign * (hours + minutes / 60);
      }
      
      if (!timezoneData.has(offset)) {
        timezoneData.set(offset, []);
      }
      timezoneData.get(offset).push(iana);
      
      // Count occurrences of each offset
      offsetStats.set(offset, (offsetStats.get(offset) || 0) + 1);
      
    } catch (error) {
      console.warn(`Error processing timezone ${iana}:`, error.message);
    }
  });
  
  // Sort offsets for analysis
  const sortedOffsets = Array.from(timezoneData.keys()).sort((a, b) => a - b);
  
  console.log('\n=== OFFSET ANALYSIS ===');
  console.log(`Unique UTC offsets found: ${sortedOffsets.length}`);
  console.log(`Offset range: ${sortedOffsets[0]} to ${sortedOffsets[sortedOffsets.length - 1]}`);
  
  // Print all offsets with counts
  console.log('\n=== COMPLETE OFFSET LIST ===');
  sortedOffsets.forEach(offset => {
    const count = offsetStats.get(offset);
    const offsetStr = formatOffset(offset);
    const timezones = timezoneData.get(offset);
    console.log(`UTC${offsetStr}: ${count} timezones`);
    
    // Show first few examples for each offset
    if (timezones.length <= 3) {
      console.log(`  Examples: ${timezones.join(', ')}`);
    } else {
      console.log(`  Examples: ${timezones.slice(0, 3).join(', ')} (and ${timezones.length - 3} more)`);
    }
  });
  
  // Check for gaps in coverage
  console.log('\n=== GAP ANALYSIS ===');
  console.log('Checking for missing offset ranges...');
  
  // Expected full range: -12 to +14 (in 0.25 hour increments)
  const expectedOffsets = [];
  for (let i = -12; i <= 14; i += 0.25) {
    expectedOffsets.push(Math.round(i * 4) / 4); // Round to nearest quarter hour
  }
  
  const missingOffsets = expectedOffsets.filter(offset => !sortedOffsets.includes(offset));
  
  if (missingOffsets.length > 0) {
    console.log('Missing UTC offsets:');
    missingOffsets.forEach(offset => {
      console.log(`  UTC${formatOffset(offset)}`);
    });
  } else {
    console.log('All expected UTC offsets are covered!');
  }
  
  // Specifically check for -12 UTC (mentioned in the issue)
  console.log('\n=== SPECIFIC ISSUE CHECK ===');
  const hasMinus12 = sortedOffsets.includes(-12);
  console.log(`UTC-12 coverage: ${hasMinus12 ? 'AVAILABLE' : 'MISSING'}`);
  
  if (hasMinus12) {
    const minus12Timezones = timezoneData.get(-12);
    console.log(`UTC-12 timezones (${minus12Timezones.length}): ${minus12Timezones.join(', ')}`);
  }
  
  // Check edge cases
  console.log('\n=== EDGE CASE ANALYSIS ===');
  const extremeNegative = sortedOffsets.filter(offset => offset <= -10);
  const extremePositive = sortedOffsets.filter(offset => offset >= 12);
  
  console.log(`Extreme negative offsets (≤ -10): ${extremeNegative.map(o => formatOffset(o)).join(', ')}`);
  console.log(`Extreme positive offsets (≥ +12): ${extremePositive.map(o => formatOffset(o)).join(', ')}`);
  
  // Summary statistics
  console.log('\n=== SUMMARY STATISTICS ===');
  console.log(`Total unique offsets: ${sortedOffsets.length}`);
  console.log(`Most populated offset: UTC${formatOffset(Array.from(offsetStats.entries()).sort((a, b) => b[1] - a[1])[0][0])} (${Math.max(...offsetStats.values())} timezones)`);
  console.log(`Least populated offsets: ${Array.from(offsetStats.entries()).filter(([,count]) => count === 1).map(([offset]) => formatOffset(offset)).join(', ')}`);
  
  // Return data for further analysis
  return {
    timezoneData,
    offsetStats,
    sortedOffsets,
    missingOffsets,
    hasMinus12
  };
}

/**
 * Format UTC offset for display
 */
function formatOffset(offset) {
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const hours = Math.floor(absOffset);
  const minutes = Math.round((absOffset - hours) * 60);
  
  if (minutes === 0) {
    return `${sign}${hours}`;
  }
  return `${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
}

// Run the analysis
try {
  const analysis = analyzeTimezones();
  
  // Additional analysis: check if the issue is about search functionality
  console.log('\n=== SEARCH FUNCTIONALITY ANALYSIS ===');
  console.log('Testing search for -12 UTC timezone...');
  
  // Simulate search patterns that users might try
  const searchPatterns = [
    'utc-12',
    'gmt-12', 
    'UTC-12',
    'GMT-12',
    '-12',
    'baker',  // Baker Island is UTC-12
    'howland' // Howland Island is UTC-12
  ];
  
  console.log('Search patterns to test:');
  searchPatterns.forEach(pattern => {
    console.log(`  "${pattern}"`);
  });
  
} catch (error) {
  console.error('Error during analysis:', error);
}