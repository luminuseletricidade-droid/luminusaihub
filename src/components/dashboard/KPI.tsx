import React from 'react';

interface KPIProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
}

const KPI: React.FC<KPIProps> = ({ title, value, icon }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between transition-transform transform hover:scale-105">
            <div>
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                <p className="text-3xl font-bold text-gray-800">{value}</p>
            </div>
            <div className="bg-gray-100 rounded-full p-3">
                {icon}
            </div>
        </div>
    );
};

export default KPI;
