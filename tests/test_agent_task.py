import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('agent_task', Path(__file__).resolve().parents[1] / 'scripts/agent_task.py')
agent_task = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent_task)


class IssueDataTests(unittest.TestCase):
    def test_shell_metacharacters_remain_literal_data(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            marker = directory / 'must-not-exist'
            payload = f'$(touch {marker}) `touch {marker}` " ; exit 1 #\n繁體中文'
            agent_task.prepare({'issue': {'number': 42, 'title': payload, 'body': payload}}, directory)
            self.assertFalse(marker.exists())
            self.assertIn(payload, (directory / 'prompt.txt').read_text())
            self.assertIn(payload, (directory / 'pr-body.txt').read_text())
            self.assertNotIn('\n', (directory / 'title.txt').read_text())

    def test_issue_number_is_validated(self):
        with tempfile.TemporaryDirectory() as temp:
            for number in ['42; echo bad', -1, True]:
                with self.subTest(number=number), self.assertRaises(ValueError):
                    agent_task.prepare({'issue': {'number': number}}, Path(temp))

    def test_empty_issue_body_is_supported(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            agent_task.prepare({'issue': {'number': 1, 'title': '修復', 'body': None}}, directory)
            self.assertEqual((directory / 'title.txt').read_text(), 'Agent: 修復')
