import { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Table, Tag, Breadcrumb, Button } from "antd";
import ReactECharts from "echarts-for-react";
import { useNavigate } from "react-router-dom";
import { api, CRISIS_COLORS, CRISIS_LABELS } from "../api";

interface Summary {
  total_students: number;
  total_reports: number;
  completed_assignments: number;
  total_assignments: number;
  completion_rate: number;
  crisis_counts: Record<string, number>;
}
interface DeptRow {
  department_id: number;
  name: string;
  node_type: string;
  has_children: boolean;
  student_count: number;
  report_count: number;
  crisis_count: number;
  avg_score: number;
}
interface MemberRow {
  user_id: number;
  name: string;
  department_name?: string;
  latest_report_id?: number | null;
  latest_scale?: string | null;
  latest_score?: number | null;
  crisis_level: string;
  submitted_at?: string | null;
}

export default function Overview() {
  const nav = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [depts, setDepts] = useState<DeptRow[]>([]);
  // breadcrumb stack of {id, name} for drill-down
  const [stack, setStack] = useState<{ id: number | null; name: string }[]>([
    { id: null, name: "全部" },
  ]);
  const [members, setMembers] = useState<MemberRow[] | null>(null);

  const loadDepts = async (parentId: number | null) => {
    setMembers(null);
    const { data } = await api.get<DeptRow[]>("/overview/departments", {
      params: parentId == null ? {} : { parent_id: parentId },
    });
    setDepts(data);
  };

  useEffect(() => {
    api.get("/overview/summary").then((r) => setSummary(r.data));
    api.get("/overview/trend").then((r) => setTrend(r.data));
    loadDepts(null);
  }, []);

  const drillInto = (row: DeptRow) => {
    setStack((s) => [...s, { id: row.department_id, name: row.name }]);
    if (row.has_children) loadDepts(row.department_id);
    else loadMembers(row.department_id);
  };

  const loadMembers = async (deptId: number) => {
    const { data } = await api.get<MemberRow[]>(
      `/overview/department/${deptId}/members`
    );
    setMembers(data);
  };

  const goToCrumb = (idx: number) => {
    const target = stack[idx];
    setStack(stack.slice(0, idx + 1));
    loadDepts(target.id);
  };

  const crisis = summary?.crisis_counts || {};
  const pieData = ["high", "medium", "low", "none"].map((k) => ({
    name: CRISIS_LABELS[k],
    value: crisis[k] || 0,
    itemStyle: { color: CRISIS_COLORS[k] },
  }));

  return (
    <div>
      <h2 className="page-title">数据总览</h2>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="在册学员" value={summary?.total_students ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="测评报告" value={summary?.total_reports ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="任务完成率"
              value={summary?.completion_rate ?? 0}
              suffix="%"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="预警人次(中/高)"
              value={(crisis.medium || 0) + (crisis.high || 0)}
              valueStyle={{ color: "#f5222d" }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={10}>
          <Card title="风险等级分布（饼图）">
            <ReactECharts
              style={{ height: 280 }}
              option={{
                tooltip: { trigger: "item" },
                legend: { bottom: 0 },
                series: [
                  {
                    type: "pie",
                    radius: ["40%", "70%"],
                    data: pieData,
                    label: { formatter: "{b}: {c}" },
                  },
                ],
              }}
            />
          </Card>
        </Col>
        <Col span={14}>
          <Card title="测评提交与预警趋势（折线图）">
            <ReactECharts
              style={{ height: 280 }}
              option={{
                tooltip: { trigger: "axis" },
                legend: { data: ["提交量", "预警量"], bottom: 0 },
                xAxis: { type: "category", data: trend.map((t) => t.date) },
                yAxis: { type: "value" },
                series: [
                  {
                    name: "提交量",
                    type: "line",
                    smooth: true,
                    data: trend.map((t) => t.submitted),
                    areaStyle: {},
                  },
                  {
                    name: "预警量",
                    type: "line",
                    smooth: true,
                    data: trend.map((t) => t.crisis),
                    itemStyle: { color: "#f5222d" },
                  },
                ],
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="各部门 / 班级数据分布（点击可下钻）"
        extra={
          <Breadcrumb
            items={stack.map((s, i) => ({
              title: (
                <a onClick={() => goToCrumb(i)}>{s.name}</a>
              ),
            }))}
          />
        }
      >
        {!members && (
          <>
            <ReactECharts
              style={{ height: 260, marginBottom: 16 }}
              option={{
                tooltip: { trigger: "axis" },
                legend: { data: ["学员数", "报告数", "预警数"], bottom: 0 },
                xAxis: { type: "category", data: depts.map((d) => d.name) },
                yAxis: { type: "value" },
                series: [
                  { name: "学员数", type: "bar", data: depts.map((d) => d.student_count) },
                  { name: "报告数", type: "bar", data: depts.map((d) => d.report_count) },
                  {
                    name: "预警数",
                    type: "bar",
                    data: depts.map((d) => d.crisis_count),
                    itemStyle: { color: "#f5222d" },
                  },
                ],
              }}
            />
            <Table
              rowKey="department_id"
              dataSource={depts}
              pagination={false}
              columns={[
                { title: "名称", dataIndex: "name" },
                {
                  title: "类型",
                  dataIndex: "node_type",
                  render: (t) => (t === "class" ? "班级" : "部门"),
                },
                { title: "学员数", dataIndex: "student_count" },
                { title: "报告数", dataIndex: "report_count" },
                {
                  title: "预警数",
                  dataIndex: "crisis_count",
                  render: (v) => <Tag color={v ? "red" : "default"}>{v}</Tag>,
                },
                { title: "平均分", dataIndex: "avg_score" },
                {
                  title: "操作",
                  render: (_, r) => (
                    <Button type="link" onClick={() => drillInto(r)}>
                      {r.has_children ? "进入下级" : "查看成员"}
                    </Button>
                  ),
                },
              ]}
            />
          </>
        )}
        {members && (
          <Table
            rowKey="user_id"
            dataSource={members}
            pagination={false}
            columns={[
              { title: "姓名", dataIndex: "name" },
              { title: "班级", dataIndex: "department_name" },
              { title: "最近量表", dataIndex: "latest_scale" },
              { title: "最近得分", dataIndex: "latest_score" },
              {
                title: "风险",
                dataIndex: "crisis_level",
                render: (v) => (
                  <Tag color={CRISIS_COLORS[v]}>{CRISIS_LABELS[v]}</Tag>
                ),
              },
              {
                title: "操作",
                render: (_, r) =>
                  r.latest_report_id ? (
                    <Button
                      type="link"
                      onClick={() => nav(`/reports/${r.latest_report_id}`)}
                    >
                      查看报告
                    </Button>
                  ) : (
                    <span style={{ color: "#aaa" }}>无权限/无报告</span>
                  ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
