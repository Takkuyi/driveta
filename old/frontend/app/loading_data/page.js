"use client";
import { useEffect, useState } from "react";

export default function LoadingDataTable() {
    const [data, setData] = useState([]);
    const [selectedDate, setSelectedDate] = useState("");  // 選択した日付

    useEffect(() => {
        if (selectedDate) {
            fetch(`http://127.0.0.1:5000/loading_data/summary/${selectedDate}`) // 選択した日付のデータを取得
                .then((response) => response.json())
                .then((data) => setData(data))
                .catch((error) => console.error("APIエラー:", error));
        }
    }, [selectedDate]);

    return (
        <div className="max-w-5xl mx-auto mt-10 p-6 bg-white shadow-md rounded-md">
            <h1 className="text-2xl font-bold mb-4 text-center">積込量データ</h1>

            {/* 日付選択フォーム */}
            <div className="flex justify-center mb-4">
                <label className="mr-2 font-semibold">日付選択:</label>
                <input 
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border p-2 rounded-md"
                />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                    <thead>
                        <tr className="bg-blue-100">
                            <th className="border border-gray-300 p-2">仕分日</th>
                            <th className="border border-gray-300 p-2">コース名</th>
                            <th className="border border-gray-300 p-2">指示書枚数</th>
                            <th className="border border-gray-300 p-2">総重量</th>
                            <th className="border border-gray-300 p-2">総PL枚数</th>
                            <th className="border border-gray-300 p-2">赤PL枚数</th>
                            <th className="border border-gray-300 p-2">平PL枚数</th>
                            <th className="border border-gray-300 p-2">青PL枚数</th>
                            <th className="border border-gray-300 p-2">段PL枚数</th>
                            <th className="border border-gray-300 p-2">データ入力日</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length > 0 ? (
                            data.map((item) => (
                                <tr key={item.fld_積込量ID} className="text-center">
                                    <td className="border border-gray-300 p-2">{item.fld_仕分日}</td>
                                    <td className="border border-gray-300 p-2">{item.fld_コース名}</td>
                                    <td className="border border-gray-300 p-2">{item.指示書枚数}</td>
                                    <td className="border border-gray-300 p-2">{item.重量合計}</td>
                                    <td className="border border-gray-300 p-2">{item.総PL枚数}</td>
                                    <td className="border border-gray-300 p-2">{item.赤PL枚数}</td>
                                    <td className="border border-gray-300 p-2">{item.平PL枚数}</td>
                                    <td className="border border-gray-300 p-2">{item.青PL枚数}</td>
                                    <td className="border border-gray-300 p-2">{item.段PL枚数}</td>
                                    <td className="border border-gray-300 p-2">{item.fld_データ入力日}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="text-center p-4 text-gray-500">
                                    データがありません
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
