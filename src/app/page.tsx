'use client';

import React, { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';

// 타입 정의
interface Part {
  name: string;
  sets_done: number;
  sets_target: number;
  monthly_cumulative?: number;
  monthly_target?: number;
}

interface Log {
  id: number;
  created_at: string;
  year: number;
  month: number;
  parts: Part[];
}

// 데이터 가져오기 함수 (fetcher)
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 아이콘 컴포넌트들
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const MinusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>;

const monthlyTargets: { [key: string]: number } = { '가슴': 5, '등': 5, '하체': 4, '어깨': 3, '이두': 3, '삼두': 3 };

export default function HomePage() {
    const { data: logs, error } = useSWR<Log[]>('/api/logs', fetcher);
    const [processedLogs, setProcessedLogs] = useState<Log[]>([]);
    const [newPartName, setNewPartName] = useState<string>("");
    const [newPartSets, setNewPartSets] = useState<number>(5);
    const [notification, setNotification] = useState<string>("");

    useEffect(() => {
        // logs가 배열이 아니거나 존재하지 않으면 early return
        if (!logs || !Array.isArray(logs)) {
            console.log('Logs is not an array or does not exist:', logs);
            return;
        }

        const monthlyCounts: { [key: string]: { [key: string]: number } } = {};
        const logsSortedAsc = [...logs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        const calculatedLogs = logsSortedAsc.map(log => {
            const logDate = new Date(log.created_at);
            const year = logDate.getFullYear();
            const month = logDate.getMonth();
            const monthKey = `${year}-${month}`;

            if (!monthlyCounts[monthKey]) {
                monthlyCounts[monthKey] = {};
            }
            
            const updatedParts = log.parts.map(part => {
                const partName = part.name;
                monthlyCounts[monthKey][partName] = (monthlyCounts[monthKey][partName] || 0) + 1;
                
                return {
                    ...part,
                    monthly_cumulative: monthlyCounts[monthKey][partName],
                    monthly_target: monthlyTargets[part.name] || 5
                };
            });
            
            return { ...log, parts: updatedParts };
        });
        setProcessedLogs(calculatedLogs.reverse()); // 최신순으로 다시 뒤집기
    }, [logs]);

    const showNotification = (message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(""), 2000);
    };

    const handleAddLog = async () => {
        if (!newPartName.trim()) return;
        const newLog = {
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            parts: [{ name: newPartName, sets_done: 0, sets_target: newPartSets }],
        };
        try {
            const response = await fetch('/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLog),
            });
            
            if (!response.ok) {
                throw new Error('Failed to add log');
            }
            
            mutate('/api/logs');
            setNewPartName("");
            showNotification("새로운 운동 기록이 추가되었습니다.");
        } catch (error) {
            console.error('Error adding log:', error);
            showNotification("기록 추가에 실패했습니다.");
        }
    };
    
    const handleAddPartToLog = async (logId: number) => {
        if (!newPartName.trim()) return;
        const log = processedLogs.find(l => l.id === logId);
        if (!log) return;
        const updatedParts = [...log.parts, { name: newPartName, sets_done: 0, sets_target: newPartSets }];
        try {
            const response = await fetch('/api/logs', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: logId, parts: updatedParts }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to update log');
            }
            
            mutate('/api/logs');
            setNewPartName("");
            showNotification("운동 부위가 추가되었습니다.");
        } catch (error) {
            console.error('Error updating log:', error);
            showNotification("운동 부위 추가에 실패했습니다.");
        }
    };

    const updateSets = async (logId: number, partIndex: number, delta: number) => {
        const log = processedLogs.find(l => l.id === logId);
        if (!log) return;
        const newParts = [...log.parts];
        const currentSets = newParts[partIndex].sets_done;
        if (currentSets + delta >= 0) {
            newParts[partIndex].sets_done += delta;
            try {
                const response = await fetch('/api/logs', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: logId, parts: newParts }),
                });
                
                if (!response.ok) {
                    throw new Error('Failed to update sets');
                }
                
                mutate('/api/logs');
            } catch (error) {
                console.error('Error updating sets:', error);
                showNotification("세트 수정에 실패했습니다.");
            }
        }
    };
    
    const handleDeleteLog = async (logId: number) => {
        try {
            const response = await fetch('/api/logs', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: logId }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete log');
            }
            
            mutate('/api/logs');
            showNotification("기록이 삭제되었습니다.");
        } catch (error) {
            console.error('Error deleting log:', error);
            showNotification("기록 삭제에 실패했습니다.");
        }
    };

    const formatLogToString = (log: Log, index: number): string => {
        if (!logs || !Array.isArray(logs)) return "";
        const logDate = new Date(log.created_at);
        const logYear = logDate.getFullYear();
        const logMonth = logDate.getMonth() + 1;
        const totalSessions = logs.length - index;
        const monthLogs = logs.filter(l => new Date(l.created_at).getFullYear() === logYear && new Date(l.created_at).getMonth() + 1 === logMonth);
        const monthSessions = monthLogs.length - monthLogs.findIndex(l => l.id === log.id);
        const partsStr = log.parts.map(p => `[${p.name}] (${p.monthly_cumulative}/${p.monthly_target}회)`).join(" ");
        const date = logDate.getDate();
        return `${logYear}년 ${totalSessions}회차 ${logMonth}월 ${date}/20회 ${partsStr}`;
    };

    const copyToClipboard = (log: Log, index: number) => {
        const textToCopy = formatLogToString(log, index);
        navigator.clipboard.writeText(textToCopy).then(() => {
            showNotification("클립보드에 복사되었습니다!");
        }, () => {
            showNotification("복사에 실패했습니다.");
        });
    };

    // 에러 상태 표시
    if (error) {
        console.error('SWR Error:', error);
        return (
            <div className="bg-gray-900 text-white min-h-screen font-sans p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center bg-red-800 p-8 rounded-xl">
                        <h2 className="text-2xl font-bold text-red-300 mb-4">데이터 로딩 실패</h2>
                        <p className="text-red-200">서버 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.</p>
                        <button 
                            onClick={() => mutate('/api/logs')} 
                            className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                        >
                            다시 시도
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans p-4 sm:p-6 lg:p-8">
            {notification && (
                <div className="fixed top-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg animate-fade-in-out z-50">{notification}</div>
            )}
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-cyan-400">운동 기록부</h1>
                    <p className="text-gray-400 mt-2">with Next.js & Supabase</p>
                </header>

                <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
                    <h2 className="text-2xl font-semibold mb-4 text-white">새 운동 기록 추가</h2>
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <input type="text" value={newPartName} onChange={(e) => setNewPartName(e.target.value)} placeholder="운동 부위 (예: 가슴)" className="flex-grow bg-gray-700 text-white placeholder-gray-500 p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                        <div className="flex items-center gap-2">
                             <label htmlFor="sets" className="text-gray-300">목표 세트:</label>
                             <input type="number" id="sets" value={newPartSets} onChange={(e) => setNewPartSets(e.target.valueAsNumber)} min="1" className="bg-gray-700 w-20 text-white p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                        </div>
                        <button onClick={handleAddLog} className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center gap-2">
                           <PlusIcon /> 새 날짜에 추가
                        </button>
                    </div>
                </div>

                <main>
                    <h2 className="text-2xl font-semibold mb-4 text-white">운동 히스토리</h2>
                    {!logs && !error && <div className="text-center text-gray-400">데이터를 불러오는 중...</div>}
                    {logs && Array.isArray(logs) && logs.length === 0 && <div className="text-center bg-gray-800 p-8 rounded-xl text-gray-400">아직 기록이 없습니다.</div>}
                    {processedLogs && Array.isArray(processedLogs) && (
                        <div className="space-y-4">
                            {processedLogs.map((log, index) => (
                                <div key={log.id} className="bg-gray-800 p-5 rounded-xl shadow-lg">
                                    <div className="flex justify-between items-start mb-4">
                                        <p className="font-mono text-lg text-cyan-300 break-all">{formatLogToString(log, index)}</p>
                                        <div className="flex gap-2 flex-shrink-0 ml-4">
                                            <button onClick={() => copyToClipboard(log, index)} className="p-2 text-gray-400 hover:text-white"><CopyIcon /></button>
                                            <button onClick={() => handleDeleteLog(log.id)} className="p-2 text-gray-400 hover:text-red-500"><TrashIcon /></button>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {log.parts.map((part, partIndex) => (
                                            <div key={partIndex} className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
                                                <span className="font-semibold text-white">{part.name} (오늘의 세트)</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xl font-bold text-white">{part.sets_done}</span>
                                                    <span className="text-gray-400">/ {part.sets_target} 세트</span>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => updateSets(log.id, partIndex, -1)} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full"><MinusIcon /></button>
                                                        <button onClick={() => updateSets(log.id, partIndex, 1)} className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full"><PlusIcon /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4">
                                      <button onClick={() => handleAddPartToLog(log.id)} className="text-sm text-cyan-400 hover:text-cyan-300">+ 이 날짜에 운동 부위 추가하기</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}