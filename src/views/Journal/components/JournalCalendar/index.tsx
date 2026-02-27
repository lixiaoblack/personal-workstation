/**
 * 日历组件
 */

import React from "react";
import type { CalendarData } from "../../config";

interface JournalCalendarProps {
  data: CalendarData;
}

export const JournalCalendar: React.FC<JournalCalendarProps> = ({ data }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
          {data.month}
        </h3>
        <div className="flex gap-1">
          <button className="rounded p-1 hover:bg-bg-hover">
            <span className="material-symbols-outlined text-sm">
              chevron_left
            </span>
          </button>
          <button className="rounded p-1 hover:bg-bg-hover">
            <span className="material-symbols-outlined text-sm">
              chevron_right
            </span>
          </button>
        </div>
      </div>

      {/* 星期标题 */}
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-text-tertiary">
        <span>日</span>
        <span>一</span>
        <span>二</span>
        <span>三</span>
        <span>四</span>
        <span>五</span>
        <span>六</span>
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {data.days.map((day, index) => (
          <div
            key={index}
            className={`relative flex h-8 items-center justify-center text-xs ${
              !day.isCurrentMonth
                ? "text-text-tertiary"
                : day.isToday
                  ? "rounded-full bg-primary font-bold text-white"
                  : "text-text-primary"
            }`}
          >
            {day.day}
            {day.hasEvent && !day.isToday && (
              <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
