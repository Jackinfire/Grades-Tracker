import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';

// --- THEME DATA ---
// This object stores all the text and styling variations for the different themes.
const themes = {
    default: {
        title: "Grades Tracker",
        subtitle: "Track your academic progress.",
        overallTitle: "Overall Degree Classification",
        overallLabel: "Calculated Degree Average:",
        yearAvgLabel: "Year Average:",
        moduleScoreLabel: "Module Score:",
        addTarget1: "For a 1st (70%):",
        addTarget2: "For a 2:1 (60%):",
        getFeedback: (grade) => "",
        getGradeColor: (grade) => {
            if (grade >= 70) return 'text-green-600';
            if (grade >= 60) return 'text-yellow-600';
            if (grade >= 50) return 'text-orange-500';
            return 'text-red-600';
        }
    },
    joshMode: {
        title: "Slay Tracker ✨",
        subtitle: "Manifesting that main character energy.",
        overallTitle: "Final Glow Up",
        overallLabel: "Current Slay Factor:",
        yearAvgLabel: "Annual Slayage:",
        moduleScoreLabel: "Serving:",
        addTarget1: "To Secure the Slay (70%):",
        addTarget2: "Vibe Check (60%):",
        getFeedback: (grade) => {
            if (grade >= 70) return "You're literally slaying! ✨";
            if (grade >= 60) return "You're doing amazing, sweetie! 💅";
            if (grade >= 50) return "Pop off, queen!";
            return "Main character energy loading... �";
        },
        getGradeColor: (grade) => {
            if (grade >= 70) return 'text-pink-500';
            if (grade >= 60) return 'text-purple-500';
            if (grade >= 50) return 'text-indigo-500';
            return 'text-gray-500';
        }
    },
    asianParent: {
        title: "Family Honor Report Card",
        subtitle: "Are you a doctor yet?",
        overallTitle: "Current Disappointment Level",
        overallLabel: "Overall Family Status:",
        yearAvgLabel: "Annual Review:",
        moduleScoreLabel: "Performance:",
        addTarget1: "For Doctor (95%):",
        addTarget2: "To Avoid Disgrace (90%):",
        getFeedback: (grade) => {
            if (grade >= 95) return "Acceptable.";
            if (grade >= 90) return "Why not 100? Did you forget how to study?";
            if (grade >= 80) return "B stands for 'Beggar'.";
            if (grade >= 70) return "See your cousin? They got 98.";
            return "Don't talk to me.";
        },
        getGradeColor: (grade) => {
            if (grade >= 95) return 'text-green-600';
            if (grade >= 90) return 'text-yellow-600';
            if (grade >= 80) return 'text-orange-500';
            return 'text-red-600';
        }
    }
};

// --- HELPER & CALCULATION FUNCTIONS ---

/**
 * Calculates the weighted average for a single module based on its assessments.
 * @param {object} module - The module object.
 * @returns {object} An object containing the calculated average and the total weight of graded assessments.
 */
const calculateModuleAverage = (module) => {
    let totalWeightedScore = 0, totalWeight = 0;
    module.assessments.forEach(a => {
        if (a.grade !== null && !isNaN(a.grade) && a.weight > 0) {
            totalWeightedScore += a.grade * (a.weight / 100);
            totalWeight += a.weight / 100;
        }
    });
    return { average: totalWeight === 0 ? 0 : totalWeightedScore / totalWeight, totalWeight: totalWeight * 100 };
};

/**
 * Calculates the weighted average for a year based on its modules and their ECTS credits.
 * Uses the moderated score if available, otherwise calculates it.
 * @param {object} year - The year object.
 * @returns {number} The calculated year average.
 */
const calculateYearAverage = (year) => {
    let totalWeightedModuleScore = 0, totalEcts = 0;
    year.modules.forEach(module => {
        const moduleScore = module.moderatedScore ?? calculateModuleAverage(module).average;
        if (moduleScore > 0 && module.ects > 0) {
            totalWeightedModuleScore += moduleScore * module.ects;
            totalEcts += module.ects;
        }
    });
    return totalEcts === 0 ? 0 : totalWeightedModuleScore / totalEcts;
};

/**
 * Calculates the final degree average based on the averages and weightings of all years.
 * @param {Array} years - The array of all year objects.
 * @returns {number} The final calculated degree average.
 */
const calculateOverallDegreeAverage = (years) => {
    let totalWeightedYearScore = 0, totalWeighting = 0;
    years.forEach(year => {
        if(year.weighting > 0) {
            totalWeightedYearScore += calculateYearAverage(year) * year.weighting;
            totalWeighting += year.weighting;
        }
    });
    return totalWeighting === 0 ? 0 : totalWeightedYearScore / totalWeighting;
};

/**
 * Calculates the average grade needed on remaining assessments to achieve a target module grade.
 * @param {object} module - The module object.
 * @param {number} target - The target grade (e.g., 70 for a First).
 * @returns {string} The required average, or a status like 'N/A', 'Done', or 'Achieved'.
 */
const calculateTargetGrade = (module, target) => {
    if (!module || module.moderatedScore !== null) return 'N/A';
    let gradedWeight = 0, achievedScore = 0;
    module.assessments.forEach(a => {
        if (a.grade !== null && !isNaN(a.grade)) {
            gradedWeight += a.weight;
            achievedScore += a.grade * a.weight;
        }
    });
    const remainingWeight = 100 - gradedWeight;
    if (remainingWeight <= 0) return 'Done';
    const neededScore = (target * 100) - achievedScore;
    if (neededScore <= 0) return 'Achieved';
    const requiredAverage = neededScore / remainingWeight;
    return requiredAverage > 100 ? '>100%' : `${requiredAverage.toFixed(2)}%`;
};

// --- COMPONENTS ---

/**
 * A modal component that asks for user confirmation before performing an action.
 * @param {object} props - Contains the message, onConfirm, and onCancel functions.
 */
const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <p className="text-lg text-gray-800 mb-4">{message}</p>
            <div className="flex justify-end gap-4">
                <button onClick={onCancel} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
                <button onClick={onConfirm} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700">Delete</button>
            </div>
        </div>
    </div>
);

/**
 * A simple tooltip component that shows text on hover.
 * @param {object} props - Contains the tooltip text and the child element to wrap.
 */
const Tooltip = ({ text, children }) => (
    <div className="relative inline-block group">
        {children}
        <span className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-gray-700 text-white text-xs rounded-md shadow-lg text-center invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity">
            {text}
        </span>
    </div>
);

/**
 * Renders a single assessment row with inputs for title, date, weight, and grade.
 * @param {object} props - Contains assessment data and handler functions for update/delete.
 */
const Assessment = ({ assessment, onUpdate, onDelete }) => (
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-t">
        <input type="text" value={assessment.title} onChange={(e) => onUpdate('title', e.target.value)} className="col-span-4 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-300 rounded p-1 -m-1" placeholder="Assessment Title" />
        <input type="date" value={assessment.dueDate} onChange={(e) => onUpdate('dueDate', e.target.value)} className="col-span-3 p-1 border rounded-md text-sm bg-gray-50" />
        <div className="col-span-2 flex items-center">
            <label className="text-sm mr-2">W:</label>
            <input type="text" inputMode="decimal" value={assessment.weight} onChange={(e) => onUpdate('weight', e.target.value)} className="w-full p-1 border rounded-md bg-gray-50" placeholder="%" />
        </div>
        <div className="col-span-2 flex items-center">
            <label className="text-sm mr-2">G:</label>
            <input type="text" inputMode="decimal" value={assessment.grade ?? ''} onChange={(e) => onUpdate('grade', e.target.value)} className="w-full p-1 border rounded-md bg-gray-50" placeholder="%" />
        </div>
        <div className="col-span-1 text-right">
            <button onClick={onDelete} className="text-gray-400 hover:text-red-500">&times;</button>
        </div>
    </div>
);

/**
 * Renders a full module, including its header, assessments, and target grade calculator.
 * @param {object} props - Contains module data, theme, and handler functions.
 */
const Module = ({ module, onUpdate, onDelete, onAddAssessment, theme }) => {
    // useMemo ensures calculations only re-run when module data changes.
    const { average, totalWeight } = useMemo(() => calculateModuleAverage(module), [module]);
    const effectiveAverage = module.moderatedScore ?? average;
    const sourceText = module.moderatedScore !== null ? '(Moderated)' : `(${totalWeight.toFixed(0)}% weighted)`;
    const t = themes[theme];
    const target1 = theme === 'asianParent' ? 95 : 70;
    const target2 = theme === 'asianParent' ? 90 : 60;

    return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mb-3">
                <input type="text" value={module.name} onChange={(e) => onUpdate('name', e.target.value)} className="md:col-span-1 text-lg font-semibold bg-gray-100 hover:bg-gray-200 focus:bg-white rounded-md p-1 -m-1 border border-transparent focus:border-blue-500" placeholder="Module Name" />
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">ECTS:</label>
                    <input type="text" inputMode="decimal" value={module.ects} onChange={(e) => onUpdate('ects', e.target.value)} className="w-20 p-1 border rounded-md bg-gray-50" />
                </div>
                <div className="text-right flex items-center justify-end space-x-4">
                    <div>
                        <span className="text-sm font-medium">{t.moduleScoreLabel}</span>
                        <span className={`text-lg font-bold ${t.getGradeColor(effectiveAverage)}`}>{effectiveAverage.toFixed(2)}%</span>
                        <div className="text-xs text-gray-500">{sourceText}</div>
                    </div>
                    <button onClick={onDelete} className="text-gray-400 hover:text-red-500 text-2xl">&times;</button>
                </div>
            </div>
            <div className="flex items-center space-x-2 mb-3">
                <label className="text-sm font-medium text-blue-600">Final Score:</label>
                <Tooltip text="Enter your official moderated score here to override the calculated average for this module.">
                    <span className="text-gray-400 cursor-pointer">(ⓘ)</span>
                </Tooltip>
                <input type="text" inputMode="decimal" value={module.moderatedScore ?? ''} onChange={(e) => onUpdate('moderatedScore', e.target.value)} className="w-24 p-1 border rounded-md bg-gray-50" placeholder="Final %" />
            </div>
            <div>
                {module.assessments.map((assessment, index) => (
                    <Assessment 
                        key={assessment.id} 
                        assessment={assessment} 
                        onUpdate={(prop, value) => onUpdate('assessments', [...module.assessments.slice(0, index), { ...assessment, [prop]: value }, ...module.assessments.slice(index + 1)])}
                        onDelete={() => onUpdate('assessments', module.assessments.filter(a => a.id !== assessment.id))}
                    />
                ))}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3 text-sm">
                <h4 className="font-semibold mb-2 text-blue-800">Target Grade Calculator</h4>
                <div className="flex justify-around">
                    <div><strong>{t.addTarget1}</strong> Need <span className="font-bold text-blue-700">{calculateTargetGrade(module, target1)}</span></div>
                    <div><strong>{t.addTarget2}</strong> Need <span className="font-bold text-blue-700">{calculateTargetGrade(module, target2)}</span></div>
                </div>
            </div>
            <button onClick={onAddAssessment} className="mt-3 text-sm bg-blue-100 text-blue-700 font-semibold py-1 px-3 rounded-md hover:bg-blue-200">Add Assessment</button>
        </div>
    );
};

/**
 * Renders a full, collapsible year section, including its modules and performance summary.
 * @param {object} props - Contains year data, theme, and handler functions.
 */
const Year = ({ year, onUpdate, onDelete, onAddModule, theme, requestDelete }) => {
    const [isCollapsed, setIsCollapsed] = useState(year.collapsed);
    const contentRef = useRef(null);
    const yearAvg = useMemo(() => calculateYearAverage(year), [year]);
    const t = themes[theme];

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
        onUpdate('collapsed', !isCollapsed);
    };
    
    // Calculate total number of assessments to trigger resize effect correctly.
    const totalAssessments = useMemo(() => {
        return year.modules.reduce((acc, module) => acc + module.assessments.length, 0);
    }, [year.modules]);

    // useLayoutEffect runs after the DOM is painted, ensuring scrollHeight is accurate.
    useLayoutEffect(() => {
        if (contentRef.current) {
            contentRef.current.style.maxHeight = isCollapsed ? '0px' : `${contentRef.current.scrollHeight}px`;
        }
    }, [isCollapsed, year.modules.length, totalAssessments]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 fade-in">
            <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={toggleCollapse}>
                <div className="flex items-center gap-2 flex-grow">
                    <svg className={`w-6 h-6 text-gray-500 transition-transform transform ${isCollapsed ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    <input type="text" value={year.name} onClick={(e) => e.stopPropagation()} onChange={(e) => onUpdate('name', e.target.value)} className="text-2xl font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 focus:bg-white rounded-md p-1 -m-1 w-1/2 border border-transparent focus:border-blue-500" />
                </div>
                <div className="text-right">
                    <span className="text-lg font-semibold text-gray-600">{t.yearAvgLabel}</span>
                    <span className={`text-2xl font-bold ${t.getGradeColor(yearAvg)}`}>{yearAvg.toFixed(2)}%</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); requestDelete('year', onDelete); }} className="ml-4 text-gray-400 hover:text-red-500 transition-colors">&times;</button>
            </div>
            <div ref={contentRef} style={{ transition: 'max-height 0.5s ease-in-out', overflow: 'hidden' }}>
                <div className="bg-gray-50 border rounded-lg p-3 mb-4">
                    <h3 className="text-md font-semibold text-gray-700 mb-2">Module Performance Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        {year.modules.length === 0 
                            ? <p className="text-gray-500 col-span-full">No modules added yet.</p>
                            : year.modules.map(module => {
                                const effectiveAverage = module.moderatedScore ?? calculateModuleAverage(module).average;
                                return <div key={module.id} className="flex justify-between items-baseline"><span className="truncate pr-2">{module.name}</span><span className={`font-semibold ${t.getGradeColor(effectiveAverage)}`}>{effectiveAverage.toFixed(2)}%</span></div>;
                            })
                        }
                    </div>
                </div>
                <div className="space-y-4">
                    {year.modules.map((module, index) => (
                        <Module 
                            key={module.id}
                            module={module}
                            theme={theme}
                            onUpdate={(prop, value) => onUpdate('modules', [...year.modules.slice(0, index), { ...module, [prop]: value }, ...year.modules.slice(index + 1)])}
                            onDelete={() => requestDelete('module', () => onUpdate('modules', year.modules.filter(m => m.id !== module.id)))}
                            onAddAssessment={() => onUpdate('modules', [...year.modules.slice(0, index), { ...module, assessments: [...module.assessments, { id: Date.now(), title: 'New Assessment', weight: 25, grade: null, dueDate: '' }] }, ...year.modules.slice(index + 1)])}
                        />
                    ))}
                </div>
                <button onClick={onAddModule} className="mt-4 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Add Module</button>
            </div>
        </div>
    );
};

/**
 * Renders the full-screen calendar modal.
 * @param {object} props - Contains all years data and the onClose handler.
 */
const Calendar = ({ years, onClose }) => {
    const [date, setDate] = useState(new Date());

    const events = useMemo(() => {
        const allEvents = {};
        years.forEach(year => {
            year.modules.forEach(module => {
                module.assessments.forEach(assessment => {
                    if (assessment.dueDate) {
                        if (!allEvents[assessment.dueDate]) allEvents[assessment.dueDate] = [];
                        allEvents[assessment.dueDate].push({ moduleName: module.name, assessment });
                    }
                });
            });
        });
        return allEvents;
    }, [years]);

    const month = date.getMonth();
    const year = date.getFullYear();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col p-4">
                <div className="flex justify-between items-center mb-4 pb-2 border-b">
                    <button onClick={() => setDate(new Date(year, month - 1))} className="p-2 rounded-full hover:bg-gray-200">&lt;</button>
                    <h2 className="text-xl font-bold">{date.toLocaleString('default', { month: 'long' })} {year}</h2>
                    <button onClick={() => setDate(new Date(year, month + 1))} className="p-2 rounded-full hover:bg-gray-200">&gt;</button>
                </div>
                <div className="grid grid-cols-7 gap-1 flex-grow text-sm">
                    {dayNames.map(day => <div key={day} className="text-center font-semibold text-gray-600 p-1">{day}</div>)}
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)}
                    {Array.from({ length: daysInMonth }).map((_, day) => {
                        const dayNumber = day + 1;
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
                        const isToday = new Date().toDateString() === new Date(year, month, dayNumber).toDateString();
                        return (
                            <div key={dayNumber} className="border rounded-md p-1 overflow-y-auto">
                                <div className={`mx-auto ${isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>{dayNumber}</div>
                                {events[dateStr]?.map((event, i) => (
                                    <div key={i} className="calendar-event" title={`${event.moduleName}: ${event.assessment.title}`}>{event.assessment.title}</div>
                                ))}
                            </div>
                        );
                    })}
                </div>
                <div className="mt-4 text-right">
                    <button onClick={onClose} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Close</button>
                </div>
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---
// This is the root component that manages the entire application's state.
export default function App() {
    // State for all academic years.
    const [years, setYears] = useState([]);
    // State for the current theme.
    const [theme, setTheme] = useState('default');
    // State to control the visibility of the calendar modal.
    const [isCalendarOpen, setCalendarOpen] = useState(false);
    // State to manage the confirmation modal for deletions.
    const [deleteRequest, setDeleteRequest] = useState(null);

    // useEffect hook to load data from localStorage when the app starts.
    useEffect(() => {
        const savedData = localStorage.getItem('gradeTrackerData');
        if (savedData) setYears(JSON.parse(savedData));
        
        const savedTheme = localStorage.getItem('currentTheme') || 'default';
        setTheme(savedTheme);
    }, []);

    // useEffect hook to save data to localStorage whenever the 'years' state changes.
    useEffect(() => {
        localStorage.setItem('gradeTrackerData', JSON.stringify(years));
    }, [years]);
    
    // useEffect hook to apply theme styles and save the theme choice to localStorage.
    useEffect(() => {
        localStorage.setItem('currentTheme', theme);
        document.body.classList.remove('josh-mode-theme', 'asian-parent-theme');
        if (theme === 'joshMode') document.body.classList.add('josh-mode-theme');
        if (theme === 'asianParent') document.body.classList.add('asian-parent-theme');
    }, [theme]);

    // --- Event Handlers ---

    const handleAddYear = () => {
        const yearNumber = years.length + 1;
        let defaultWeighting = 0;
        switch (yearNumber) {
            case 1: defaultWeighting = 7.5; break;
            case 2: defaultWeighting = 20; break;
            case 3: defaultWeighting = 36.5; break;
            case 4: defaultWeighting = 36.5; break;
            default: defaultWeighting = 0;
        }
        setYears([...years, { id: Date.now(), name: `Year ${yearNumber}`, weighting: defaultWeighting, modules: [], collapsed: false }]);
    };
    
    const handleUpdateYear = (index, prop, value) => {
        setYears([...years.slice(0, index), { ...years[index], [prop]: value }, ...years.slice(index + 1)]);
    };

    const handleDeleteYear = (index) => {
        setYears(years.filter((_, i) => i !== index));
    };
    
    const handleAddModule = (yearIndex) => {
        const newModules = [...years[yearIndex].modules, { id: Date.now(), name: 'New Module', ects: 10, moderatedScore: null, assessments: [] }];
        handleUpdateYear(yearIndex, 'modules', newModules);
    };

    const requestDelete = (type, action) => {
        setDeleteRequest({ message: `Are you sure you want to delete this ${type}?`, action });
    };

    const confirmDelete = () => {
        if (deleteRequest) {
            deleteRequest.action();
            setDeleteRequest(null);
        }
    };

    const exportToCSV = () => {
        let csvContent = "data:text/csv;charset=utf-8,Year,Module,ECTS,Moderated Score,Assessment,Due Date,Weight (%),Grade (%)\n";
        years.forEach(year => {
            year.modules.forEach(module => {
                if (module.assessments.length === 0) {
                     const row = [`"${year.name}"`, `"${module.name}"`, module.ects, module.moderatedScore ?? '', '', '', '', ''].join(',');
                     csvContent += row + "\n";
                } else {
                    module.assessments.forEach(assessment => {
                        const row = [`"${year.name}"`, `"${module.name}"`, module.ects, module.moderatedScore ?? '', `"${assessment.title}"`, assessment.dueDate, assessment.weight, assessment.grade ?? ''].join(',');
                        csvContent += row + "\n";
                    });
                }
            });
        });
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "grade_tracker_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Memoize the overall average calculation so it only runs when 'years' data changes.
    const overallAvg = useMemo(() => calculateOverallDegreeAverage(years), [years]);
    const t = themes[theme];

    // The main JSX returned by the App component, which renders the entire UI.
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl">
            {deleteRequest && <ConfirmationModal message={deleteRequest.message} onConfirm={confirmDelete} onCancel={() => setDeleteRequest(null)} />}
            <header className="text-center mb-8 relative">
                <h1 className="text-4xl font-bold text-gray-900">{t.title}</h1>
                <p className="text-gray-600 mt-2">{t.subtitle}</p>
            </header>
            
            <div className="flex justify-center items-center gap-2 mb-8 p-2 bg-gray-200 rounded-full">
                {Object.keys(themes).map(themeKey => (
                    <button key={themeKey} onClick={() => setTheme(themeKey)} className={`theme-button bg-white text-sm font-semibold py-2 px-4 rounded-full shadow-md ${theme === themeKey ? 'active' : ''}`}>
                        {themeKey === 'joshMode' ? '💅 Josh Mode' : themeKey === 'asianParent' ? '🩺 Asian Parent' : 'Default'}
                    </button>
                ))}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8 fade-in">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{t.overallTitle}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {years.map((year, index) => (
                        <div key={year.id} className="flex items-center space-x-2">
                            <label className="text-sm font-medium text-gray-600">{year.name} Wt (%):</label>
                            <input type="text" inputMode="decimal" value={year.weighting} onChange={(e) => handleUpdateYear(index, 'weighting', e.target.value)} className="w-full p-1 border rounded-md bg-gray-50" />
                        </div>
                    ))}
                </div>
                <div className="text-center bg-gray-100 p-4 rounded-lg">
                    <span className="text-lg font-semibold text-gray-600">{t.overallLabel}</span>
                    <span className={`text-3xl font-bold ml-2 ${t.getGradeColor(overallAvg)}`}>{overallAvg.toFixed(2)}%</span>
                    <p className="text-sm text-gray-500 mt-1 h-5">{t.getFeedback(overallAvg)}</p>
                </div>
            </div>

            <div className="flex justify-center items-center gap-4 mb-8">
                <button onClick={handleAddYear} className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:bg-blue-700">Add Academic Year</button>
                <button onClick={() => setCalendarOpen(true)} className="bg-purple-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:bg-purple-700">View Calendar</button>
                <button onClick={exportToCSV} className="bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:bg-green-700">Export to CSV</button>
            </div>

            <div className="space-y-8">
                {years.map((year, index) => (
                    <Year 
                        key={year.id} 
                        year={year} 
                        theme={theme}
                        onUpdate={(prop, value) => handleUpdateYear(index, prop, value)}
                        onDelete={() => handleDeleteYear(index)}
                        onAddModule={() => handleAddModule(index)}
                        requestDelete={requestDelete}
                    />
                ))}
            </div>

            {isCalendarOpen && <Calendar years={years} onClose={() => setCalendarOpen(false)} />}
        </div>
    );
}
�