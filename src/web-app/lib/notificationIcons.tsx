import Autorenew from "@mui/icons-material/Autorenew";
import CancelOutlined from "@mui/icons-material/CancelOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import HourglassTop from "@mui/icons-material/HourglassTop";
import ReportProblemOutlined from "@mui/icons-material/ReportProblemOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";

export const statusIconMap = {
  awaiting: { icon: HourglassTop, color: "#F59E0B" },
  progress: { icon: Autorenew, color: "#3B82F6" },
  dispute: { icon: ReportProblemOutlined, color: "#EF4444" },
  ready: { icon: TaskAltOutlined, color: "#10B981" },
} as const;

export const actionIconMap = {
  approve: CheckCircleOutlineIcon,
  reject: CancelOutlined,
  message: ChatBubbleOutlineIcon,
  review: VisibilityOutlined,
} as const;
