import React from 'react';

const WithdrawalCountdown = ({ withdrawalStatus, showTitle = true }) => {
  if (!withdrawalStatus) {
    return null;
  }
  
  const { canWithdraw, daysLeft, hoursLeft, minutesLeft } = withdrawalStatus;
  
  if (canWithdraw) {
    return (
      <div className="text-center">
        <span className="text-green-500 font-bold">يمكنك السحب الآن</span>
      </div>
    );
  }
  
  return (
    <div className="withdrawal-countdown">
      {showTitle && (
        <h3 className="text-lg font-bold text-yellow-500 mb-2">الوقت المتبقي حتى فتح السحب</h3>
      )}
      
      <div className="countdown-timer">
        <div className="countdown-item">
          <div className="countdown-value">{daysLeft}</div>
          <div className="countdown-label">يوم</div>
        </div>
        
        <div className="countdown-separator">:</div>
        
        <div className="countdown-item">
          <div className="countdown-value">{hoursLeft}</div>
          <div className="countdown-label">ساعة</div>
        </div>
        
        <div className="countdown-separator">:</div>
        
        <div className="countdown-item">
          <div className="countdown-value">{minutesLeft}</div>
          <div className="countdown-label">دقيقة</div>
        </div>
      </div>
    </div>
  );
};

export default WithdrawalCountdown;
