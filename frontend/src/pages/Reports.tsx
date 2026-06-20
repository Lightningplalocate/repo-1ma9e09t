import { useEffect, useState } from "react";
import { Card, Table, Tag, Button, Input } from "antd";
import { useNavigate } from "react-router-dom";
import { api, CRISIS_COLORS, CRISIS_LABELS } from "../api";
import { useAuth } from "../auth";

interface ReportSummary {
  id: number;
  user_name: string;
  department_name?: string;
  scale_name: string;
  report_type: string;
  total_score: number;
  crisis_level: string;
  submitted_at: string;
}

export default function Reports() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<ReportSummary[]>([]);
  const [kw, setKw] = useState("");

  useEffect(() => {
    api.get<ReportSummary[]>("/reports").then((r) => setRows(r.data));
  }, []);

  const filtered = rows.filter(
    (r) => !kw || r.user_name.includes(kw) || r.scale_name.includes(kw)
  );

  return (
    <div>
      <h2 className="page-title">报告管理</h2>
      <Card
        extra={
          <Input.Search
            placeholder="按姓名/量表搜索"
            allowClear
            onChange={(e) => setKw(e.target.value)}
            style={{ width: 240 }}
          />
        }
      >
        <p style={{ color: "#888", marginTop: 0 }}>
          {user?.role === "admin"
            ? "当前身份：管理员，可查看全部报告。"
            : user?.role === "counselor"
            ? "当前身份：咨询师，可查看所辖班级/部门及下属的报告。"
            : "当前身份：学员，仅可查看本人自评报告。"}
        </p>
        <Table
          rowKey="id"
          dataSource={filtered}
          columns={[
            { title: "学员", dataIndex: "user_name" },
            { title: "班级/部门", dataIndex: "department_name" },
            { title: "量表", dataIndex: "scale_name" },
            {
              title: "类型",
              dataIndex: "report_type",
              render: (t) => (t === "self" ? "自评" : "他评"),
            },
            { title: "总分", dataIndex: "total_score" },
            {
              title: "风险等级",
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
                <Button type="link" onClick={() => nav(`/reports/${r.id}`)}>
                  查看
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
