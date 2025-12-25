
import React from 'react';

const ModuleTitle: React.FC<{ icon: string, title: string, index: number }> = React.memo(({ icon, title, index }) => (
  <div className="flex items-center gap-2 border-b border-slate-700/30 pb-1">
    <div className="w-4 h-4 rounded bg-sky-500/20 flex items-center justify-center text-sky-400 text-[9px] font-bold">
      {index}
    </div>
    <i className={`${icon} text-slate-500 text-[9px]`}></i>
    <h3 className="uppercase text-[9px] font-black tracking-widest text-slate-400">{title}</h3>
  </div>
));

export default ModuleTitle;
