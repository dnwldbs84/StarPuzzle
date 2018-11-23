var User = function(data) {
  this.id = data.id || 0;
  this.googleId = data.googleId || 0;
  this.facebookId = data.facebookId || 0;
  this.twitterId = data.twitterId || 0;
  this.displayName = data.displayName || '';
  this.joinDate = data.joinDate || new Date();
  this.lastConnDate = data.lastConnDate || new Date();
  this.reConnCount = 0;
  this.rating = data.rating || 1200;
  this.pvpWinCount = 0;
  this.pvpLoseCount = 0;
  this.playSoloCount = 0;
  this.clearStage = 0;
  // this.playPvcCount = 0;
  // this.soloBestScoreDate = new Date();
  // this.soloBestScore = 0;
  // this.soloTodayDate = new Date();
  // this.soloTodayBestScore = 0;
}

module.exports = User
