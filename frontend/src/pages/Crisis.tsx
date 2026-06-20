import { useEffect, useState } from "react";
import { Card, Table, Tag, Button, Alert } from "antd";
import { useNavigate } from "react-router-dom";
import { api, CRISIS_COLORS, CRISIS_LABELS } from "../api";

interface Warning {
  id: number;
  user_name: string;
  department_name?: string;
  scale_name: string;
  total_score: number;
  crisis_level: string;
  submitted_at: string;
}

export default function Crisis() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Warning[]>([]);

  useEffect(() => {
    api.get<Warning[]>("/crisis/warnings").then((r) => setRows(r.data));
  }, []);

  return (
    <div>
      <h2 className="page-title">危机预警</h2>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="仅在危机预警模块可查看预警学员（中/高风险）的测评报告，请及时干预。"
      />
      <Card>
        <Table
          rowKey="id"
          dataSource={rows}
          columns={[
            { title: "学员", dataIndex: "user_name" },
            { title: "班级/部门", dataIndex: "department_name" },
            { title: "量表", dataIndex: "scale_name" },
            { title: "总分", dataIndex: "total_score" },
            {
              title: "预警等级",
              dataIndex: "crisis_level",
              render: (v) => <Tag color={CRISIS_COLORS[v]}>{CRISIS_LABELS[v]}</Tag>,
            },
            {
              title: "提交时间",
              dataIndex: "submitted_at",
              render: (v) => new Date(v).toLocaleString("zh-CN"),
            },
            {
              title: "操作",
              render: (_, r) => (
                <Button danger type="link" onClick={() => nav(`/reports/${r.id}`)}>
                  查看预警报告
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
