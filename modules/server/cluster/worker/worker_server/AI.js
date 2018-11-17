var CONFIG = {
  RANDOM_MOVE_TIMER_MIN : 150,
  RANDOM_MOVE_TIMER_MAX : 300,

  1 : { RATING: 1100, FACTOR_2_RATE : 100, RANDOM_FACTOR_RATE : 50, TIMER_MIN : 400, TIMER_MAX : 650 },
  2 : { RATING: 1200, FACTOR_2_RATE : 80, RANDOM_FACTOR_RATE : 40, TIMER_MIN : 400, TIMER_MAX : 500 },
  3 : { RATING: 1230, FACTOR_2_RATE : 50, RANDOM_FACTOR_RATE : 20, TIMER_MIN : 350, TIMER_MAX : 450 },
  4 : { RATING: 1260, FACTOR_2_RATE : 20, RANDOM_FACTOR_RATE : 0, TIMER_MIN : 300, TIMER_MAX : 450 },
  5 : { RATING: 1290, FACTOR_2_RATE : 0, RANDOM_FACTOR_RATE : 0, TIMER_MIN : 250, TIMER_MAX : 450 },
  6 : { RATING: 1320, FACTOR_2_RATE : 0, RANDOM_FACTOR_RATE : 0, TIMER_MIN : 150, TIMER_MAX : 350 }
}

// AI_RACTOR_4 === random move

function AI(profile) {
  this.id = profile.id;
  this.displayName = profile.displayName;
  this.rating = profile.rating;
  this.isMatch = false;
  var gameSetting = getAIGameSetting(this.rating);
  this.aiTimerMin = gameSetting.timerMin;
  this.aiTimerMax = gameSetting.timerMax;
  this.aiFactor = gameSetting.factor;
}

function getAIGameSetting(rating) {
  if (rating < CONFIG[1].RATING) {
    var config = CONFIG[1];
  } else if (rating < CONFIG[2].RATING) {
    config = CONFIG[2];
  } else if (rating < CONFIG[3].RATING) {
    config = CONFIG[3];
  } else if (rating < CONFIG[4].RATING) {
    config = CONFIG[4];
  } else if (rating < CONFIG[5].RATING) {
    config = CONFIG[5];
  } else {
    config = CONFIG[6];
  }
  // random move check
  var rand = Math.floor(Math.random() * 100);
  var factor = 2;
  if (rand < config.RANDOM_FACTOR_RATE) {
    factor = 5;
  } else {
    rand = Math.floor(Math.random() * 100);
    if (rand < config.FACTOR_2_RATE) {
      factor = 2;
    } else {
      factor = 3;
    }
  }
  if (factor !== 5) {
    return { factor: factor, timerMin: config.TIMER_MIN, timerMax: config.TIMER_MAX }
  } else {
    return { factor: factor, timerMin: CONFIG.RANDOM_MOVE_TIMER_MIN, timerMax: CONFIG.RANDOM_MOVE_TIMER_MAX }
  }
}

module.exports = AI;
