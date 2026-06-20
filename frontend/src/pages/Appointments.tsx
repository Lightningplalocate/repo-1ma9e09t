import { useEffect, useState } from "react";
import {
  Calendar,
  Card,
  Modal,
  Button,
  Tag,
  List,
  Checkbox,
  Space,
  message,
  Badge,
  Alert,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import { api } from "../api";
import { useAuth } from "../auth";

interface Appointment {
  id: number;
  date: string;
  slot: string;
  slot_label: string;
  student_id: number;
  student_name: string;
  counselor_id?: number | null;
  counselor_name: string;
  status: string;
  is_group: boolean;
  display_status: string;
  note: string;
}
interface Slot {
  key: string;
  label: string;
}

const STATUS_COLOR: Record<string, string> = {
  预约中: "processing",
  预约成功: "success",
  团体预约成功: "success",
  预约未成功: "error",
};

export default function Appointments() {
  const { user, has } = useAuth();
  const isStudent = user?.role === "student";
  const canManage =
    user?.role === "admin" || user?.role === "counselor" || has("manage_appointment");

  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selDate, setSelDate] = useState<Dayjs | null>(null);
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<number[]>([]);

  const loadMonth = (m: Dayjs) => {
    const start = m.startOf("month").format("YYYY-MM-DD");
    const end = m.endOf("month").format("YYYY-MM-DD");
    api
      .get<Appointment[]>("/appointments", { params: { start, end } })
      .then((r) => setAppts(r.data));
  };

  useEffect(() => {
    api.get<Slot[]>("/appointments/slots").then((r) => setSlots(r.data));
    loadMonth(month);
  }, []);

  const refresh = () => loadMonth(month);

  const apptsOn = (d: Dayjs) =>
    appts.filter((a) => a.date === d.format("YYYY-MM-DD"));

  const openDay = (d: Dayjs) => {
    setSelDate(d);
    setChecked([]);
    setOpen(true);
  };

  const book = async (slot: string) => {
    try {
      await api.post("/appointments", {
        date: selDate!.format("YYYY-MM-DD"),
        slot,
      });
      message.success("已提交预约，等待咨询师确认（预约中）");
      refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || "预约失败");
    }
  };

  const act = async (id: number, action: "confirm" | "cancel") => {
    try {
      await api.post(`/appointments/${id}/${action}`);
      message.success(action === "confirm" ? "已确认预约" : "已取消预约");
      refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || "操作失败");
    }
  };

  const confirmGroup = async () => {
    if (checked.length < 2) {
      message.warning("请选择至少两名学员组成团体咨询");
      return;
    }
    try {
      await api.post("/appointments/confirm-group", { ids: checked });
      message.success("已确认为团体咨询预约");
      setChecked([]);
      refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || "操作失败");
    }
  };

  const dayAppts = selDate ? apptsOn(selDate) : [];

  const cellRender = (current: Dayjs, info: any) => {
    if (info.type !== "date") return info.originNode;
    const list = apptsOn(current);
    if (!list.length) return null;
    return (
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {list.slice(0, 3).map((a) => (
          <li key={a.id} style={{ fontSize: 12, lineHeight: 1.4 }}>
            <Badge
              status={(STATUS_COLOR[a.display_status] as any) || "default"}
              text={`${a.slot_label.slice(0, 5)} ${a.student_name}`}
            />
          </li>
        ))}
        {list.length > 3 && <li style={{ fontSize: 12 }}>+{list.length - 3} …</li>}
      </ul>
    );
  };

  return (
    <div>
      <h2 className="page-title">咨询预约与排班系统</h2>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={
          isStudent
            ? "点击日历中的日期即可预约；每天 4 个时段，需提前 24 小时预约，提交后等待咨询师确认。"
            : "点击日期可查看/确认/取消该日预约；可勾选多名学员的同一时段，确认为团体咨询预约。"
        }
      />
      <Card>
        <Calendar
          value={month}
          onSelect={(d, info) => {
            if (!info || info.source === "date") openDay(d);
          }}
          onPanelChange={(d) => {
            setMonth(d);
            loadMonth(d);
          }}
          cellRender={cellRender}
        />
      </Card>

      <Modal
        title={`${selDate?.format("YYYY-MM-DD")} 咨询预约`}
        open={open}
        onCancel={() => setOpen(false)}
        footer={
          canManage
            ? [
                <Button key="group" type="primary" onClick={confirmGroup}>
                  确认为团体咨询预约（勾选多人）
                </Button>,
                <Button key="close" onClick={() => setOpen(false)}>
                  关闭
                </Button>,
              ]
            : [
                <Button key="close" onClick={() => setOpen(false)}>
                  关闭
                </Button>,
              ]
        }
        width={640}
      >
        {slots.map((s) => {
          const slotAppts = dayAppts.filter((a) => a.slot === s.key);
          const mineHere = slotAppts.find((a) => a.student_id === user?.id);
          return (
            <Card
              key={s.key}
              size="small"
              title={s.label}
              style={{ marginBottom: 12 }}
              extra={
                isStudent && !mineHere ? (
                  <Button type="primary" size="small" onClick={() => book(s.key)}>
                    预约
                  </Button>
                ) : null
              }
            >
              {slotAppts.length === 0 ? (
                <span style={{ color: "#999" }}>暂无预约</span>
              ) : (
                <List
                  size="small"
                  dataSource={slotAppts}
                  renderItem={(a) => (
                    <List.Item
                      actions={
                        canManage && a.status === "pending"
                          ? [
                              <a key="c" onClick={() => act(a.id, "confirm")}>
                                确认
                              </a>,
                              <a key="x" onClick={() => act(a.id, "cancel")}>
                                取消
                              </a>,
                            ]
                          : canManage && a.status === "confirmed"
                          ? [
                              <a key="x" onClick={() => act(a.id, "cancel")}>
                                取消
                              </a>,
                            ]
                          : isStudent && a.student_id === user?.id && a.status !== "cancelled"
                          ? [
                              <a key="x" onClick={() => act(a.id, "cancel")}>
                                取消
                              </a>,
                            ]
                          : []
                      }
                    >
                      <Space>
                        {canManage && a.status === "pending" && (
                          <Checkbox
                            checked={checked.includes(a.id)}
                            onChange={(e) =>
                              setChecked(
                                e.target.checked
                                  ? [...checked, a.id]
                                  : checked.filter((x) => x !== a.id)
                              )
                            }
                          />
                        )}
                        <span>{a.student_name}</span>
                        <Tag color={(STATUS_COLOR[a.display_status] as any) || "default"}>
                          {a.display_status}
                        </Tag>
                        {a.counselor_name && (
                          <span style={{ color: "#999" }}>
                            咨询师：{a.counselor_name}
                          </span>
                        )}
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          );
        })}
      </Modal>
    </div>
  );
}
