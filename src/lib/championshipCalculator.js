// Championship possibility calculator functions

/**
 * Calculate if drivers can still mathematically win the championship
 * @param {Array} driverStandings - Current driver standings with points
 * @param {number} remainingRaces - Number of races left in season
 * @param {number} maxPointsPerRace - Maximum points available per race (25 + 1 for fastest lap = 26)
 * @returns {Array} Enhanced standings with championship possibility data
 */
export function calculateChampionshipPossibilities(driverStandings, remainingRaces, maxPointsPerRace = 26) {
  if (!driverStandings || driverStandings.length === 0) {
    return [];
  }

  // Calculate maximum possible points for remaining races
  const maxRemainingPoints = remainingRaces * maxPointsPerRace;
  
  // Get current leader's points
  const leaderPoints = driverStandings[0]?.points || 0;
  
  // Calculate championship possibilities for each driver
  const enhancedStandings = driverStandings.map(driver => {
    // Driver's maximum possible final points
    const maxPossiblePoints = driver.points + maxRemainingPoints;
    
    // Can they beat the current leader if leader gets 0 points in remaining races?
    const canMathematicallyWin = maxPossiblePoints > leaderPoints;
    
    // Points needed to guarantee championship (assuming leader gets max points)
    const leaderMaxPossible = leaderPoints + maxRemainingPoints;
    const pointsNeededToGuarantee = Math.max(0, leaderMaxPossible - driver.points + 1);
    
    // Gap to leader
    const pointsGap = leaderPoints - driver.points;
    
    // Calculate realistic chances using mathematical approach
    let championshipOdds = 0;
    if (canMathematicallyWin) {
      // Calculate how many points per race the driver needs to outscore the leader
      const pointsNeededPerRace = (pointsGap + 1) / remainingRaces;
      
      // Calculate gap as percentage of total remaining points
      const gapPercentage = pointsGap / maxRemainingPoints;
      
      if (pointsGap === 0) {
        // Leader advantage: harder to maintain lead as more races remain
        championshipOdds = Math.max(55, 75 - (remainingRaces * 1.2));
      } else {
        // Base calculation: odds decrease as points needed per race increases
        let baseOdds;
        
        if (pointsNeededPerRace <= 2) {
          baseOdds = 45; // Very achievable - less than 2 points per race
        } else if (pointsNeededPerRace <= 4) {
          baseOdds = 35 - (pointsNeededPerRace - 2) * 8; // 35% down to 19%
        } else if (pointsNeededPerRace <= 8) {
          baseOdds = 19 - (pointsNeededPerRace - 4) * 3; // 19% down to 7%
        } else if (pointsNeededPerRace <= 13) {
          baseOdds = 7 - (pointsNeededPerRace - 8) * 1; // 7% down to 2%
        } else if (pointsNeededPerRace <= 20) {
          baseOdds = 2 - (pointsNeededPerRace - 13) * 0.2; // 2% down to 0.6%
        } else {
          baseOdds = 0.5; // Mathematical chance only
        }
        
        // Adjust based on how much of the season is left (more races = more opportunity)
        const seasonProgressFactor = Math.min(1.3, 0.8 + (remainingRaces / 20));
        
        // Adjust based on gap percentage (smaller gaps relative to remaining points = better odds)
        const gapFactor = Math.max(0.7, 1.2 - (gapPercentage * 2));
        
        championshipOdds = baseOdds * seasonProgressFactor * gapFactor;
        
        // Ensure reasonable bounds
        championshipOdds = Math.min(48, Math.max(0.1, championshipOdds));
      }
    }

    return {
      ...driver,
      championshipStatus: {
        canMathematicallyWin,
        maxPossiblePoints,
        pointsGap,
        pointsNeededToGuarantee: canMathematicallyWin ? pointsNeededToGuarantee : null,
        championshipOdds: Math.round(championshipOdds),
        status: getChampionshipStatus(canMathematicallyWin, pointsGap, remainingRaces),
        // Debug info
        mathBreakdown: {
          pointsNeededPerRace: canMathematicallyWin ? (pointsGap + 1) / remainingRaces : null,
          gapPercentage: canMathematicallyWin ? ((pointsGap / maxRemainingPoints) * 100) : null,
          maxRemainingPoints
        }
      }
    };
  });

  return enhancedStandings;
}

/**
 * Get a human-readable championship status
 */
function getChampionshipStatus(canWin, pointsGap, remainingRaces) {
  if (!canWin) {
    return "Eliminated";
  }
  
  if (pointsGap === 0) {
    return "Leading";
  } else if (pointsGap <= 10) {
    return "Strong Contender";
  } else if (pointsGap <= 25) {
    return "In Contention";
  } else if (pointsGap <= 50) {
    return "Outside Chance";
  } else {
    return "Mathematical Chance";
  }
}

/**
 * Get remaining races for a season
 * @param {string} season - Season number
 * @param {Object} pool - Database pool
 * @returns {Promise<number>} Number of remaining races
 */
export async function getRemainingRaces(season, pool) {
  try {
    // Primary method: Get total races and completed races (those with results)
    const totalRacesRes = await pool.query(
      'SELECT COUNT(*) as total FROM races WHERE season_id = (SELECT id FROM seasons WHERE season = $1)',
      [season]
    );
    
    // Get completed races (those with results)
    const completedRacesRes = await pool.query(
      'SELECT COUNT(DISTINCT r.id) as completed ' +
      'FROM races r ' +
      'JOIN race_results rr ON r.id = rr.race_id ' +
      'WHERE r.season_id = (SELECT id FROM seasons WHERE season = $1)',
      [season]
    );
    
    const totalRaces = parseInt(totalRacesRes.rows[0]?.total || 0);
    const completedRaces = parseInt(completedRacesRes.rows[0]?.completed || 0);
    
    // Backup method: If we can't determine from results, use date-based approach
    let remainingRaces = Math.max(0, totalRaces - completedRaces);
    
    // If all races exist but no results yet, try date-based calculation as fallback
    if (remainingRaces === totalRaces && totalRaces > 0) {
      const dateBasedRes = await pool.query(
        'SELECT COUNT(*) as remaining ' +
        'FROM races ' +
        'WHERE season_id = (SELECT id FROM seasons WHERE season = $1) ' +
        'AND (date IS NULL OR date > NOW())',
        [season]
      );
      
      const dateBasedRemaining = parseInt(dateBasedRes.rows[0]?.remaining || totalRaces);
      
      // Use the more conservative estimate
      remainingRaces = Math.min(remainingRaces, dateBasedRemaining);
    }
    
    return remainingRaces;
  } catch (error) {
    console.error('Error calculating remaining races:', error);
    return 0; // Conservative fallback
  }
}

/**
 * Get detailed race information for a season (useful for debugging)
 * @param {string} season - Season number  
 * @param {Object} pool - Database pool
 * @returns {Promise<Object>} Detailed race breakdown
 */
export async function getSeasonRaceDetails(season, pool) {
  try {
    const raceDetailsRes = await pool.query(
      'SELECT ' +
      '  r.id, ' +
      '  r.race_number, ' +
      '  r.date, ' +
      '  t.name as track_name, ' +
      '  CASE WHEN rr.race_id IS NOT NULL THEN true ELSE false END as has_results ' +
      'FROM races r ' +
      'LEFT JOIN tracks t ON r.track_id = t.id ' +
      'LEFT JOIN (SELECT DISTINCT race_id FROM race_results) rr ON r.id = rr.race_id ' +
      'WHERE r.season_id = (SELECT id FROM seasons WHERE season = $1) ' +
      'ORDER BY r.race_number',
      [season]
    );
    
    const races = raceDetailsRes.rows;
    const completed = races.filter(r => r.has_results).length;
    const remaining = races.length - completed;
    
    return {
      totalRaces: races.length,
      completedRaces: completed,
      remainingRaces: remaining,
      races: races.map(r => ({
        raceNumber: r.race_number,
        trackName: r.track_name,
        date: r.date,
        hasResults: r.has_results,
        status: r.has_results ? 'Completed' : 'Upcoming'
      }))
    };
  } catch (error) {
    console.error('Error getting season race details:', error);
    return { totalRaces: 0, completedRaces: 0, remainingRaces: 0, races: [] };
  }
}

/**
 * Enhanced form-based odds calculation (optional advanced feature)
 * @param {Array} driverStandings - Current standings
 * @param {number} remainingRaces - Races left
 * @param {Object} pool - Database pool for historical data
 * @param {string} season - Current season
 * @returns {Promise<Array>} Enhanced standings with form-based odds
 */
export async function calculateFormBasedOdds(driverStandings, remainingRaces, pool, season) {
  try {
    // Get recent form (last 3-5 races)
    const recentFormRes = await pool.query(
      'SELECT d.name as driver, AVG(CASE ' +
      '  WHEN rr.adjusted_position IS NOT NULL THEN rr.adjusted_position ' +
      '  ELSE rr.position END) as avg_position, ' +
      'COUNT(*) as races_counted ' +
      'FROM race_results rr ' +
      'JOIN drivers d ON rr.driver_id = d.id ' +
      'JOIN races r ON rr.race_id = r.id ' +
      'WHERE r.season_id = (SELECT id FROM seasons WHERE season = $1) ' +
      'AND r.id IN (SELECT id FROM races WHERE season_id = (SELECT id FROM seasons WHERE season = $1) ORDER BY race_date DESC LIMIT 5) ' +
      'GROUP BY d.name',
      [season]
    );
    
    const formMap = new Map();
    recentFormRes.rows.forEach(row => {
      // Better recent form = lower average position = higher form score
      const formScore = Math.max(0, 100 - (row.avg_position * 8)); // Scale 0-100
      formMap.set(row.driver, {
        avgPosition: parseFloat(row.avg_position),
        formScore,
        racesConsidered: parseInt(row.races_counted)
      });
    });
    
    // Enhance standings with form-based odds
    return driverStandings.map(driver => {
      const formData = formMap.get(driver.driver) || { formScore: 50, avgPosition: 10 };
      const baseOdds = driver.championshipStatus?.championshipOdds || 0;
      
      // Adjust odds based on form (±20% max adjustment)
      const formMultiplier = 0.8 + (formData.formScore / 250); // 0.8 to 1.2 multiplier
      const formAdjustedOdds = Math.min(99, Math.max(0, baseOdds * formMultiplier));
      
      return {
        ...driver,
        championshipStatus: {
          ...driver.championshipStatus,
          formAdjustedOdds: Math.round(formAdjustedOdds),
          recentForm: {
            avgPosition: formData.avgPosition,
            formScore: Math.round(formData.formScore),
            racesConsidered: formData.racesConsidered
          }
        }
      };
    });
  } catch (error) {
    console.error('Error calculating form-based odds:', error);
    return driverStandings; // Return original data if form calculation fails
  }
}