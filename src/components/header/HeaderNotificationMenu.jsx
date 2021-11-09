import React, { useEffect, useRef, useState } from 'react';
import cx from 'classnames';

import DefaultNotifiImg from 'assets/svgs/monster.svg';
import { NavLink } from 'react-router-dom';

export function HeaderNotificationMenu() {
  const [notiPopupVisible, setNotiPopupVisible] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef && !wrapperRef.current.contains(event.target)) {
        setNotiPopupVisible(false);
      }
    }
    // Bind the event listener
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);

  const handleClickNotificationButton = () => {
    setNotiPopupVisible(previousValue => !previousValue);
  };

  return (
    <div className="header__notifications" ref={wrapperRef}>
      <div
        className="js-notifications-icon"
        onClick={handleClickNotificationButton}
      >
        <i className="ri-notification-3-line"></i>
      </div>
      <div
        className={cx(
          'notifications_popup space-y-20',
          notiPopupVisible && 'visible'
        )}
      >
        <div className="d-flex justify-content-between">
          <h5> Notifications</h5>
          <a href="Activity.html" className="badge color_white">
            View all
          </a>
        </div>
        <div className="item space-x-20 d-flex justify-content-between align-items-center">
          <img className="thumb" src={DefaultNotifiImg} alt="..." />
          <div className="details">
            <NavLink to="#">
              {' '}
              <h6>Money revieved</h6>{' '}
            </NavLink>
            <p>0.6 ETH</p>
          </div>
          <span className="circle"></span>
        </div>
      </div>
    </div>
  );
}