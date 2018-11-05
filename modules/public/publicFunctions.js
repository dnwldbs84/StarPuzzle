exports.calcScore = function(matchCount, combo, isDanger) {
  return Math.floor((isDanger ? 1.25 : 1) * (parseInt(matchCount) * 25 + 10 * (parseInt(combo) + 1)));
}

exports.calcSkillScore = function(matchCount) {
  return matchCount * 10;
}

exports.calcRating = function(myRating, oppRating, isWin) {
  if (isWin) {
    return Math.floor(myRating + 16 + (oppRating - myRating) * (16 / 400));
  } else {
    return Math.floor(myRating - (16 + (myRating - oppRating) * (16 / 400)));
  }
}

exports.checkName = function(str, min, max) {
  // string = string.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
  // string = string.replace(/[^a-zA-Z0-9]/g, '');
  // str.replace(/[^\w ]/, '')

  var str = str.replace(/[^a-zA-Z0-9가-힣\s]/g, '').substring(0, max);
  if (str.length < min) { return false; }
  else { return str; }
}
