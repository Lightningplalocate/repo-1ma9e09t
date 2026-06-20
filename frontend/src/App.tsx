import { Layout, Menu, Dropdown, Avatar, Spin } from "antd";
import {
  DashboardOutlined,
  FileTextOutlined,
  WarningOutlined,
  SolutionOutlined,
  BookOutlined,
  TeamOutlined,
  UserOutlined,
  LogoutOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Reports from "./pages/Reports";
import ReportDetail from "./pages/ReportDetail";
import ReportEdit from "./pages/ReportEdit";
import Crisis from "./pages/Crisis";
import Tasks from "./pages/Tasks";
import MyAssessments from "./pages/MyAssessments";
import Scales from "./pages/Scales";
import People from "./pages/People";
import Appointments from "./pages/Appointments";

const { Header, Sider, Content } = Layout;

function Shell() {
  const { user, logout, has } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" />;

  const items = [
    { key: "/overview", icon: <DashboardOutlined />, label: "数据总览", show: true },
    {
      key: "/reports",
      icon: <FileTextOutlined />,
      label: "报告管理",
      show:
        has("view_reports") || has("view_all_reports") || has("view_self_report"),
    },
    {
      key: "/crisis",
      icon: <WarningOutlined />,
      label: "危机预警",
      show: has("view_crisis"),
    },
    {
      key: "/tasks",
      icon: <SolutionOutlined />,
      label: "测评任务",
      show: has("distribute_tasks"),
    },
    {
      key: "/my-assessments",
      icon: <SolutionOutlined />,
      label: "我的测评",
      show: user.role === "student",
    },
    {
      key: "/appointments",
      icon: <CalendarOutlined />,
      label: "咨询预约与排班系统",
      show:
        has("book_appointment") ||
        has("manage_appointment") ||
        user.role === "counselor" ||
        user.role === "admin",
    },
    { key: "/scales", icon: <BookOutlined />, label: "量表库", show: true },
    {
      key: "/people",
      icon: <TeamOutlined />,
      label: "部门与人员档案管理",
      show:
        has("manage_users") ||
        has("manage_departments") ||
        user.role === "counselor",
    },
  ].filter((i) => i.show);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider theme="dark" breakpoint="lg" collapsedWidth="0">
        <div
          style={{
            color: "#fff",
            padding: "16px",
            fontSize: 16,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          心理测评平台
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[loc.pathname]}
          items={items.map((i) => ({ key: i.key, icon: i.icon, label: i.label }))}
          onClick={({ key }) => nav(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: "#fff",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            paddingRight: 24,
          }}
        >
          <Dropdown
            menu={{
              items: [
                {
                  key: "logout",
                  icon: <LogoutOutlined />,
                  label: "退出登录",
                  onClick: () => {
                    logout();
                    nav("/login");
                  },
                },
              ],
            }}
          >
            <span style={{ cursor: "pointer" }}>
              <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
              {user.full_name || user.username}
            </span>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24 }}>
          <Routes>
            <Route path="/overview" element={<Overview />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/crisis" element={<Crisis />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/my-assessments" element={<MyAssessments />} />
            <Route path="/scales" element={<Scales />} />
            <Route path="/people" element={<People />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="*" element={<Navigate to="/overview" />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  const { loading, user } = useAuth();
  if (loading)
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <Spin size="large" />
      </div>
    );
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/overview" /> : <Login />} />
      {/* 报告页：取消左侧模块栏，整体内容居中（独立于主框架） */}
      <Route
        path="/reports/:id"
        element={user ? <ReportDetail /> : <Navigate to="/login" />}
      />
      <Route
        path="/reports/:id/edit"
        element={user ? <ReportEdit /> : <Navigate to="/login" />}
      />
      <Route path="/*" element={<Shell />} />
    </Routes>
  );
}
