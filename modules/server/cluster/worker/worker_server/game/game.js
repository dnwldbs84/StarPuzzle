var gameLevelData = require('../../../../../public').data.engagementGameLevelData;
var skillData = require('../../../../../public').data.skillData;
var publicConfig = require('../../../../../public').config;

var Game = function() {
  this.level = 1;
  this.score = 0;

  this.hostSkill = 1;
  this.oppSkill = 1;
  this.hostSkillRequiredScore1 = skillData[this.hostSkill].requiredScore1;
  this.hostSkillRequiredScore2 = skillData[this.hostSkill].requiredScore2;
  this.oppSkillRequiredScore1 = skillData[this.oppSkill].requiredScore1;
  this.oppSkillRequiredScore2 = skillData[this.oppSkill].requiredScore2;
  this.hostSkillScore = 0;
  this.oppSkillScore = 0;

  this.hostGemCount = 44;
  this.oppGemCount = 44;

  this.isGameOver = false;

  this.standbyGemCount = 0;
  // this.dropStandbyGemTimer = 1000;
  // this.standbyGemTimer = 500;

  this.standbyGemTimeout = false;
  this.dropStandbyGemTimeout = false;

  this.onGameOverByOverGem = new Function();
  this.onNeedInformGameData = new Function();
}
Game.prototype = {
  setSkill: function(hostSkill, oppSkill) {
    this.hostSkill = hostSkill;
    this.oppSkill = oppSkill;
    this.hostSkillRequiredScore1 = skillData[hostSkill] ? skillData[hostSkill].requiredScore1 : skillData[1].requiredScore1;
    this.oppSkillRequiredScore1 = skillData[oppSkill] ? skillData[oppSkill].requiredScore1 : skillData[1].requiredScore1;
    this.hostSkillRequiredScore2 = skillData[hostSkill] ? skillData[hostSkill].requiredScore2 : skillData[1].requiredScore2;
    this.oppSkillRequiredScore2 = skillData[oppSkill] ? skillData[oppSkill].requiredScore2 : skillData[1].requiredScore2;
  },
  makeStandbyGem: function(isFirst) {
    var self = this;
    var delay = isFirst ? 2800 : gameLevelData[self.level].standbyGemAddDelay;
    this.standbyGemTimeout = setTimeout(() => {
        if (self.standbyGemCount < 15) {
          var type = Math.floor(Math.random() * gameLevelData[self.level].gemTypeCount) + 1;
          var score = 0;
          var coordX = 2 * (Math.floor(Math.random() * publicConfig.BOARD_COLS) + 1) - 1;

          if (gameLevelData[self.level].additionalScoreGemDropRate) {
            var rand = Math.floor(Math.random() * 100);
            if (gameLevelData[self.level].additionalScoreGemDropRate > rand) {
              // add score
              score = Math.floor(Math.random() *
              (gameLevelData[self.level].additionalScoreMax - gameLevelData[self.level].additionalScoreMin + 1))
              + gameLevelData[self.level].additionalScoreMin;
            }
          }
          self.onNeedInformGameData(publicConfig.MESSAGE_DATA_TYPE.INT_ARRAY,
            publicConfig.MESSAGE_TYPE.ADD_STANDBY_GEM,
            [type, score, coordX]);
            self.standbyGemCount++;
          }
          self.makeStandbyGem();
      }, delay);
  },
  dropStandbyGem: function(isFirst) {
    var self = this;
    var delay = isFirst ? 3000 : gameLevelData[self.level].dropDelay;
    this.dropStandbyGemTimeout = setTimeout(() => {
      self.onNeedInformGameData(publicConfig.MESSAGE_DATA_TYPE.INT_ARRAY,
        publicConfig.MESSAGE_TYPE.DROP_STANDBY_GEM);

        self.standbyGemCount--;

        self.hostGemCount++;
        self.oppGemCount++;

        if (self.hostGemCount > 77) {
          self.onGameOverByOverGem(true);
        } else if (self.oppGemCount > 77) {
          self.onGameOverByOverGem(false);
        } else {
          self.dropStandbyGem();
        }
      }, delay);
  },
  addScore: function(score, addSkillScore, isGameHost) {
    this.score += score;
    if (addSkillScore) {
      if (isGameHost) {
        this.hostSkillScore += score;
      } else {
        this.oppSkillScore += score;
      }
    }
    // console.log('addScore');
    // console.log(this.score + ' : ' + this.hostSkillScore + ' : ' + this.oppSkillScore);
    if (gameLevelData[this.level].nextLevelScore && this.score > gameLevelData[this.level].nextLevelScore) {
      // level up
      this.level++;
      this.onNeedInformGameData(publicConfig.MESSAGE_DATA_TYPE.INT_ARRAY,
        publicConfig.MESSAGE_TYPE.LEVEL_UP);
    }
  },
  useSkill: function(isGameHost) {
    var canUse = false;
    var isLevel2 = false;
    if (isGameHost) {
      // console.log(this.hostSkillScore + ' : ' + this.hostSkillRequiredScore1)
      if (this.hostSkillScore >= this.hostSkillRequiredScore2) {
        isLevel2 = true;
      }
      if (this.hostSkillScore >= this.hostSkillRequiredScore1) {
        this.hostSkillScore = 0;
        canUse = true;
      }
    } else {
      // console.log(this.oppSkillScore + ' : ' + this.oppSkillRequiredScore1)
      if (this.oppSkillScore >= this.oppSkillRequiredScore2) {
        isLevel2 = true;
      }
      if (this.oppSkillScore >= this.oppSkillRequiredScore1) {
        this.oppSkillScore = 0;
        canUse = true;
      }
    }
    return { canUse : canUse, isLevel2 : isLevel2 };
  },
  explodeGems: function(count, isGameHost) {
    if (isGameHost) {
      this.hostGemCount -= count;
      if (this.hostGemCount < 0) { this.hostGemCount = 0; }
    } else {
      this.oppGemCount -= count;
      if (this.oppGemCount < 0) { this.oppGemCount = 0; }
    }
  },
  gameOver: function() {
    this.isGameOver = true;

    clearTimeout(this.standbyGemTimeout);
    clearTimeout(this.dropStandbyGemTimeout);
    this.standbyGemTimeout = false;
    this.dropStandbyGemTimeout = false;
  }
}
exports.makeGameInstance = function() {
  return new Game();
}
exports.getInitGems = function(level) {
  var returnArray = [];
  var zipData = 0;
  for (var i=0; i<publicConfig.BOARD_COLS * publicConfig.START_ROWS; i++) {
    if (i === 0) {
      returnArray.push(0);
    } else {
      var type = Math.floor(Math.random() * (gameLevelData[level].gemTypeCount)) + 1;
      if (i % 2 === 1) {
        zipData = type * 16;
      } else {
        zipData += type;
        returnArray.push(zipData);
      }
    }
  }
  return returnArray;
}
