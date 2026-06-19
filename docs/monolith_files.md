# Monolith Files Report

รายการ Source Code ในโปรเจกต์ที่มีจำนวนบรรทัด **มากกว่า 300 บรรทัด** (อัปเดตล่าสุดหลังจากผ่านการ Refactor อย่างต่อเนื่อง โดยตัดสคริปต์ที่ใช้สำหรับ Refactor (`refactor_*.py`), ฐานข้อมูล, `package-lock.json`, รูปภาพ และฟอนต์ออกแล้ว) 

🎉 *โปรเจกต์มีพัฒนาการที่ดีมากครับ! ตอนนี้เหลือไฟล์ที่ใหญ่กว่า 300 บรรทัดเพียงแค่ 2 ไฟล์เท่านั้นจากเดิมที่มีถึง 16 ไฟล์* 🎉

| File name | File path | total line number | what is file about (in Thai) |
| :--- | :--- | :--- | :--- |
| **ExpandedVisualizationModal.jsx** | `/workspaces/KTB/frontend/src/features/dashboard/components/ExpandedVisualizationModal.jsx` | 425 | เป็นคอมโพเนนต์ React (Modal) สำหรับแสดงผลข้อมูลเชิงลึกแบบต่างๆ บนหน้า Dashboard (ได้รับการ Refactor ลดขนาดลงมาจาก 1,600+ บรรทัด) |
| **compute.py** | `/workspaces/KTB/backend/app/services/analytics/user_performance/compute.py` | 317 | ประมวลผลข้อมูลสถิติประสิทธิภาพการทำงานของผู้ใช้ (User Performance) เช่น รวบรวมเวลาที่ใช้ในแต่ละขั้นตอน และคำนวณเวลาการทำงานสุทธิ |
